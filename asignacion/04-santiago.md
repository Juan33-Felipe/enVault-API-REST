# Guía de Santiago Rivas Tulcán — Encryption + Secrets (La Bóveda)

> Lee primero [00-plan-general.md](00-plan-general.md). Si usas Claude, pásale ambos archivos.

## Tu rol
Construyes **la Bóveda**, el corazón de enVault:
- **Fase 2:** `EncryptionService`, que cifra y descifra con AES-256-GCM. No depende de nadie más que de la Fase 1.
- **Fase 4:** `SecretsService` + `SecretsController`, la pieza que **une todo**: usa el `AuthGuard` de Kevin, el entorno de Marlon, la auditoría de Juan y tu propio cifrado.

Eres el **último eslabón**: cuando tu Fase 4 se fusiona, el MVP queda funcional y empieza la Fase 5 para todos.

## Tus archivos (solo estos)
| Archivo | Fase |
|---|---|
| `src/secrets/encryption.service.ts` | 2 |
| `src/secrets/encryption.service.spec.ts` (nuevo) | 2 |
| `src/secrets/secrets.module.ts` | 2 y 4 |
| `src/secrets/secrets.service.ts` | 4 |
| `src/secrets/secrets.controller.ts` | 4 |
| `src/secrets/secretEntity.ts` | 4 (solo limpiar comentarios) |
| `src/secrets/secrets.service.spec.ts` (nuevo, recomendado) | 4 |

---

## FASE 2 — EncryptionService  ⏱ espera a que Kevin fusione la Fase 1

```bash
git checkout develop
git pull origin develop
git checkout -b feat/encryption-service
npm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Pega el resultado del último comando en `ENCRYPTION_MASTER_KEY` dentro de `.env`.

### Paso 1. `encryption.service.ts`
```ts
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(config: ConfigService) { ... }

  encrypt(plainText: string): string { ... }
  decrypt(payload: string): string { ... }
}
```

**Constructor**
- Lee `config.get<string>('ENCRYPTION_MASTER_KEY')` (`ConfigService` es global gracias a Kevin, no hace falta importar `ConfigModule`).
- Conviértela: `Buffer.from(hex, 'hex')`. Si no existe o no mide **32 bytes**, lanza `new Error('ENCRYPTION_MASTER_KEY debe tener 64 caracteres hex (32 bytes)')`. Así la app no arranca mal configurada.

**`encrypt(plainText)`**
1. `const iv = randomBytes(12);` (12 bytes es lo recomendado para GCM; **nuevo en cada llamada**).
2. `const cipher = createCipheriv(this.algorithm, this.key, iv);`
3. `const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);`
4. `const authTag = cipher.getAuthTag();`
5. Devuelve **exactamente** este formato: `` `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}` ``

**`decrypt(payload)`**
1. `split(':')`. Si no salen 3 partes → `throw new Error('Formato de secreto cifrado inválido')`.
2. `createDecipheriv(this.algorithm, this.key, iv)` → `decipher.setAuthTag(authTag)`.
3. `Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')`.
4. Si el dato fue alterado o la clave es otra, `final()` lanza error: déjalo propagar (lo manejas en la Fase 4).

Usa `import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'`. **No uses** hash, Base64 solo, ni librerías externas.

### Paso 2. `encryption.service.spec.ts`
Crea el servicio con un `ConfigService` falso (`{ get: () => 'a'.repeat(64) }`) y prueba:
- `decrypt(encrypt('hola mundo')) === 'hola mundo'` (incluye también tildes y emojis).
- Cifrar dos veces el mismo texto da **resultados distintos** (por el IV aleatorio).
- El texto cifrado **no contiene** el texto original.
- Alterar un carácter del payload hace que `decrypt` lance un error.
- Una clave de largo incorrecto hace que el constructor lance un error.

### Paso 3. `secrets.module.ts`
Agrega `providers: [EncryptionService]` (deja `imports` y `exports` como están por ahora).

### Paso 4. Subir
```bash
npm run build
npm run lint
npm test
npm run format
```
PR `feat/encryption-service` → `develop`. Revisor sugerido: **Juan Felipe** o **Marlon**.
Aviso: **`✅ FASE 2 – EncryptionService fusionado.`**

---

## Mientras esperas la Fase 3 (Kevin)
- Revisa el PR de Kevin `feat/auth-guard`: tu controller depende de que deje `request.environment` cargado.
- Puedes adelantar `SecretsService` en tu rama: el servicio **no depende del guard**, solo recibe un `Environment` como parámetro. Para el `AuditService` usa un mock con la firma del plan general si Juan aún no fusionó.

---

## FASE 4 — Secrets  ⏱ espera a que estén fusionados: Encryption (tú), Audit (Juan) y AuthGuard (Kevin)

**Confirma antes de empezar** que en `develop` existen `AuthGuard` exportado desde `AuthModule`, `AuditService.log` + `AuditAction`, y `src/auth/authenticated-request.ts`.
```bash
git checkout develop
git pull origin develop
git checkout -b feat/secrets-crud
```

### Paso 1. `secrets.module.ts`
```ts
@Module({
  imports: [TypeOrmModule.forFeature([Secret]), AuthModule, AuditModule],
  controllers: [SecretsController],
  providers: [SecretsService, EncryptionService],
})
export class SecretsModule {}
```
(Quita el `exports: [TypeOrmModule]`: ya nadie más necesita el repositorio de secretos.)

### Paso 2. `secrets.service.ts`
Inyecta `@InjectRepository(Secret) Repository<Secret>`, `EncryptionService` y `AuditService`.
Todos los métodos reciben **el entorno autenticado** y la IP. **REGLA DE ORO: toda consulta filtra por `environment: { id: env.id }`.** Esa línea es el aislamiento; si falta, un entorno podría leer secretos de otro.

| Método | Qué hace | Errores | Auditoría |
|---|---|---|---|
| `create(env, keyName, value, ip)` | Valida, cifra `value`, guarda `{ keyName, encryptedValue, environment: { id: env.id } }`. Devuelve `{ id, keyName, createdAt }` **sin** el valor | `keyName` o `value` vacíos o que no sean texto → 400; ya existe en ese entorno → 409 | `CREATE_SECRET` |
| `findAll(env, ip)` | Lista los secretos **del entorno** descifrados: `[{ keyName, value }]` | — | `READ_ALL_SECRETS` |
| `findOne(env, keyName, ip)` | Busca por `keyName` **y** `env.id`, descifra y devuelve `{ keyName, value }` | No existe → 404 | `READ_SECRET` |
| `update(env, keyName, value, ip)` *(opcional)* | Vuelve a cifrar con un IV nuevo (rotación) | No existe → 404 | `UPDATE_SECRET` |
| `remove(env, keyName, ip)` *(opcional)* | Elimina | No existe → 404 | `DELETE_SECRET` |

Detalles:
- **Validación de `keyName`:** texto no vacío de 1 a 150 caracteres (el largo de la columna). Recomendado: solo `^[A-Z0-9_]+$` después de pasarlo a mayúsculas.
- **Duplicado:** comprueba antes con `findOne`, o captura el error de PostgreSQL con código `'23505'` (restricción `UQ_secrets_key_name_environment`) → `ConflictException`.
- **Auditoría en cada método:**
  ```ts
  await this.auditService.log({
    action: AuditAction.READ_SECRET,
    actor: env.name,
    status: AuditStatus.SUCCESS,   // o FAILED antes de lanzar 404/409/400
    target: keyName,
    ipAddress: ip,
  });
  ```
  Registra `FAILED` **antes** de lanzar cada excepción y `SUCCESS` al terminar bien.
- **Si `decrypt` falla** (dato corrupto o clave cambiada): registra `FAILED` y lanza `InternalServerErrorException('No se pudo descifrar el secreto')`. **Nunca** devuelvas el `encryptedValue` ni el detalle del error.
- **Nunca** pongas el valor del secreto en `log()`, `console.log` ni en los mensajes de error.

### Paso 3. `secrets.controller.ts`
```ts
@Controller('secrets')
@UseGuards(AuthGuard)
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: { keyName?: unknown; value?: unknown }) { ... }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) { ... }

  @Get(':keyName')
  findOne(@Req() req: AuthenticatedRequest, @Param('keyName') keyName: string) { ... }

  // Opcionales:
  @Put(':keyName')    update(...)
  @Delete(':keyName') @HttpCode(204) remove(...)
}
```
- El entorno **siempre** sale de `req.environment` (lo pone el guard). **Nunca** lo leas del body, la URL ni otro header: si no, un cliente podría elegir el entorno de otro.
- La IP es `req.ip`.

### Paso 4. `secretEntity.ts`
Solo limpieza: borra los TODOs resueltos y cambia el comentario que dice "guardarse como un **Hash** ilegible" por "guardarse **cifrado** con AES-256-GCM (EncryptionService)". No cambies columnas.

### Paso 5. Prueba unitaria (recomendado): `secrets.service.spec.ts`
Con repositorio, `EncryptionService` y `AuditService` mockeados:
- `findOne` busca con `environment: { id: env.id }`.
- `findOne` inexistente → `NotFoundException` y `log` con `FAILED`.
- `create` guarda el valor **cifrado**, no el original.

### Paso 6. Probar a mano
```bash
npm run start:dev
```
1. Crea dos entornos (`POST /environments`) y guarda sus `apiKey`.
2. Guarda un secreto:
   ```bash
   curl -X POST http://localhost:3000/secrets -H "Content-Type: application/json" -H "x-api-key: <KEY_PROD>" -d "{\"keyName\":\"DB_PASSWORD\",\"value\":\"superSecreta123\"}"
   ```
3. Léelo con la key de PROD (200), con la de QA (404) y sin key (401).
4. Revisa la BD; **no** debe aparecer `superSecreta123`:
   ```bash
   docker compose exec db psql -U envault -c "select key_name, encrypted_value from secrets;"
   ```
5. Revisa la auditoría:
   ```bash
   docker compose exec db psql -U envault -c "select action, actor, target, status from audit_logs order by timestamp;"
   ```

### Paso 7. Subir
```bash
npm run build
npm run lint
npm test
npm run format
```
PR `feat/secrets-crud` → `develop`. Revisores sugeridos: **Kevin** y **Marlon**.
Aviso: **`✅ FASE 4 – Secrets fusionado. El MVP ya funciona de punta a punta: empieza la Fase 5.`**

---

## FASE 5 — README  ⏱ después de fusionar la Fase 4

**Rama:** `docs/readme-final`
- Borra `REDME.MD` (es un duplicado con error de tipeo).
- En `README.MD`: cierra el bloque de código sin terminar, quita el `│021` suelto y las "NOTAS TEMPORALES", y reemplaza la estructura con la **estructura real** de `src/`.
- Agrega la sección **"Cómo levantar el proyecto"** (pasos de la sección 5 del plan general) y la tabla de endpoints con un ejemplo `curl` de cada uno.
- Menciona como mejoras futuras: HTTPS, rotación de la clave maestra, roles de administrador, migraciones en lugar de `synchronize`, y volver a integrar `@nestjs/observe`.

---

## Checklist personal
- [ ] F2: `encrypt`/`decrypt` con AES-256-GCM, IV de 12 bytes nuevo en cada cifrado, formato `iv:authTag:cipherText`.
- [ ] F2: la clave sale de `ENCRYPTION_MASTER_KEY` y se valida su largo; tests de cifrado pasando. PR fusionado.
- [ ] F4: todas las consultas filtran por `env.id`; el entorno sale solo de `req.environment`.
- [ ] F4: cada operación registra `SUCCESS` o `FAILED` sin incluir valores secretos.
- [ ] F4: 400 / 401 / 404 / 409 correctos; en la BD solo hay valores cifrados. PR fusionado y aviso enviado.
- [ ] F5: README final.

## Notas para Claude
- **Cifrado, no hash.** AES-256-GCM con `node:crypto`, sin librerías nuevas. El formato `iv:authTag:cipherText` en base64 es fijo: si cambia, los secretos ya guardados dejan de descifrarse.
- La regla de aislamiento no es negociable: cualquier `find`/`update`/`delete` sobre `Secret` debe incluir `environment: { id: env.id }`, con `env` tomado de `req.environment`.
- No modifiques `src/auth/*`, `src/audit/*`, `src/environments/*` ni `app.module.ts`. Si el contrato de `AuthGuard` o `AuditService` en `develop` no coincide con el plan general, avisa al usuario en vez de adaptarlo.
- No agregues `class-validator` ni DTOs (decisión del MVP): valida con `typeof` + `BadRequestException`.
