# Guía de Marlon Alexander — Environments (El Aislamiento)

> Lee primero [00-plan-general.md](00-plan-general.md). Si usas Claude, pásale ambos archivos.

## Tu rol
Construyes el módulo de **entornos** (`PRODUCCION`, `QA`, `DESARROLLO`…). Cada entorno tiene su propia **API key**, y esa key es la que decide qué secretos puede ver un backend. Es la base del **aislamiento**.

Tu trabajo **desbloquea a Kevin** (Fase 3): su `AuthGuard` necesita tu `findByApiKey()` para saber a qué entorno pertenece cada petición.

## Tus archivos (solo estos)
| Archivo | Qué haces |
|---|---|
| `src/environments/environmentEntity.ts` | Agregar la columna `apiKeyHash` |
| `src/environments/environments.service.ts` | Lógica: crear, listar, buscar por API key |
| `src/environments/environments.controller.ts` | Rutas `POST /environments` y `GET /environments` |
| `src/environments/environments.module.ts` | Registrar controller y service, y **exportar el service** |
| `src/environments/environments.service.spec.ts` (nuevo, recomendado) | Prueba unitaria |

**No toques** `secretEntity.ts`, `app.module.ts` ni archivos de otros módulos.

---

## FASE 2 — Environments  ⏱ espera a que Kevin fusione la Fase 1

**Antes de empezar**, confirma que en `develop` ya está la Fase 1 (`app.module.ts` tiene `TypeOrmModule.forRootAsync`):
```bash
git checkout develop
git pull origin develop
git checkout -b feat/environments-crud
npm install
cp .env.example .env      # completa los valores (ver plan general, sección 5)
docker compose up -d
```

### Paso 1. Entidad: `environmentEntity.ts`
Agrega una columna para el **hash** de la API key (nunca la key en claro):
```ts
@Column({ name: 'api_key_hash', type: 'varchar', length: 64, unique: true, select: false })
apiKeyHash: string;
```
- `length: 64` porque SHA-256 en hex mide 64 caracteres.
- `select: false` hace que **no aparezca** en `find()` normales, así `GET /environments` nunca la filtra. Los `where` sobre esa columna siguen funcionando.
- Elimina los comentarios TODO de "Sigan los TODOs…" que ya están resueltos. **No agregues todavía** el `@OneToMany` hacia `Secret` (es opcional, ver Fase 5).

### Paso 2. Servicio: `environments.service.ts`
```ts
@Injectable()
export class EnvironmentsService {
  constructor(
    @InjectRepository(Environment)
    private readonly environmentsRepository: Repository<Environment>,
  ) {}

  async create(name: string, description?: string): Promise<{ environment: Environment; apiKey: string }> { ... }
  findAll(): Promise<Environment[]> { ... }
  findByApiKey(apiKey: string): Promise<Environment | null> { ... }
}
```

**`create(name, description?)`**
1. Normaliza: `name.trim().toUpperCase()`. Si queda vacío → `BadRequestException('El nombre es obligatorio')`.
2. Si ya existe un entorno con ese nombre → `ConflictException('El entorno ya existe')`.
3. Genera la key: `const apiKey = 'env_' + randomBytes(24).toString('hex');` (`import { randomBytes, createHash } from 'node:crypto'`).
4. Calcula el hash con un método privado:
   ```ts
   private hashApiKey(apiKey: string): string {
     return createHash('sha256').update(apiKey).digest('hex');
   }
   ```
5. Guarda `{ name, description: description ?? null, apiKeyHash }`.
6. Devuelve `{ environment, apiKey }` (la key **en claro**, solo esta vez). Antes de devolver, borra `apiKeyHash` del objeto (`delete` o desestructuración) para que no salga en la respuesta.

**`findAll()`**: devuelve todos ordenados por `createdAt` ascendente. Gracias a `select: false` no incluye el hash.

**`findByApiKey(apiKey)`** ← **contrato con Kevin, no cambies la firma**
- Recibe la key **en claro**, la hashea con `hashApiKey` y busca `findOne({ where: { apiKeyHash: hash } })`.
- Devuelve el `Environment` o `null`. **No lanza** excepciones (el guard decide qué hacer).

### Paso 3. Controller: `environments.controller.ts`
```ts
@Controller('environments')
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Post()
  async create(@Body() body: { name?: string; description?: string }) { ... }

  @Get()
  findAll() { ... }
}
```
- `POST`: si `body.name` no es un `string` → `BadRequestException`. Responde:
  ```json
  {
    "id": "…",
    "name": "PRODUCCION",
    "description": null,
    "createdAt": "…",
    "apiKey": "env_3f9c…",
    "warning": "Guarda esta API key: no se volverá a mostrar."
  }
  ```
- `GET`: lista de entornos **sin** API key.
- Estas rutas **no** llevan `AuthGuard` en el MVP.

### Paso 4. Módulo: `environments.module.ts`
```ts
@Module({
  imports: [TypeOrmModule.forFeature([Environment])],
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
```
**Importante:** exportar `EnvironmentsService` es lo que permite a Kevin usarlo en `AuthModule`.

### Paso 5. Prueba unitaria (recomendado): `environments.service.spec.ts`
Con un repositorio mockeado (`getRepositoryToken(Environment)`), prueba:
- `create` devuelve una `apiKey` que empieza con `env_` y guarda un hash de 64 caracteres distinto de la key.
- `findByApiKey` busca por el hash, no por la key en claro.
- `create` con nombre duplicado lanza `ConflictException`.

### Paso 6. Probar a mano
```bash
npm run start:dev
```
```bash
curl -X POST http://localhost:3000/environments -H "Content-Type: application/json" -d "{\"name\":\"produccion\"}"
```
```bash
curl http://localhost:3000/environments
```
- El primer `POST` devuelve `apiKey`; repetirlo da **409**.
- El `GET` **no** muestra `apiKeyHash`.
- En la BD la columna `api_key_hash` tiene 64 caracteres hex y **no** coincide con la key:
  `docker compose exec db psql -U envault -c "select name, api_key_hash from environments;"`

### Paso 7. Subir
```bash
npm run build
npm run lint
npm test
npm run format
```
PR `feat/environments-crud` → `develop`. Revisor sugerido: **Kevin** (es quien depende de esto).
Al fusionar, avisa: **`✅ FASE 2 – Environments fusionado. Kevin: findByApiKey ya está en develop.`**

---

## Mientras esperas (Fases 3 y 4)
1. Revisa el PR de Kevin (`feat/auth-guard`): comprueba que llame a `findByApiKey` con la key en claro.
2. **Opcional, cuando el AuditModule de Juan esté en `develop`:** en una rama nueva `feat/environments-audit`, importa `AuditModule` en `environments.module.ts` y, al crear un entorno, registra:
   ```ts
   await this.auditService.log({
     action: AuditAction.CREATE_ENVIRONMENT,
     actor: 'admin',
     status: AuditStatus.SUCCESS,
     target: environment.name,
     ipAddress: req.ip,
   });
   ```
   Para obtener la IP, recibe `@Req() req: Request` en el controller y pásala al servicio.

---

## FASE 5 — Prueba de aislamiento  ⏱ espera a que Secrets (Santiago) esté fusionado

**Rama:** `test/aislamiento`
1. Crea dos entornos (`PRODUCCION`, `QA`) y guarda sus keys.
2. Con la key de PRODUCCION guarda `DB_PASSWORD`.
3. Con la key de QA pide `GET /secrets/DB_PASSWORD` → debe dar **404**. Con la de PRODUCCION → 200.
4. Con la key de QA guarda otro `DB_PASSWORD` distinto → debe funcionar (es otro entorno), y cada key debe leer **su propio** valor.
5. Documenta los resultados (capturas o comandos `curl`) en `docs/prueba-aislamiento.md`.

Opcional: agregar la relación inversa en `environmentEntity.ts`, **coordinando con Santiago** porque también hay que tocar `secretEntity.ts`:
```ts
@OneToMany(() => Secret, (secret) => secret.environment)
secrets: Secret[];
```

---

## Checklist personal
- [ ] Columna `apiKeyHash` (`select: false`, `unique`).
- [ ] `create` genera `env_…`, guarda solo el hash y devuelve la key una vez.
- [ ] `findByApiKey(apiKey)` recibe la key en claro y devuelve `Environment | null`.
- [ ] `EnvironmentsService` exportado desde el módulo.
- [ ] `POST`/`GET /environments` funcionan; nombre duplicado → 409.
- [ ] Build, lint y test pasan. PR fusionado y aviso enviado.
- [ ] F5: prueba de aislamiento documentada.

## Notas para Claude
- La firma `findByApiKey(apiKey: string): Promise<Environment | null>` es un contrato con Kevin: no la cambies, no la hagas lanzar excepciones y no le cambies el nombre.
- El hash es SHA-256 en hex **sin sal** a propósito: hay que poder buscar por hash. No uses bcrypt (no permite buscar).
- No agregues `class-validator` ni DTOs (decisión del MVP). Usa `BadRequestException`/`ConflictException` de `@nestjs/common`.
- No modifiques `src/secrets/*` ni `app.module.ts`.
