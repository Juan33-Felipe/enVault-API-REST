# Guía de Juan Felipe Zambrano — Audit (La Caja Negra)

> Lee primero [00-plan-general.md](00-plan-general.md). Si usas Claude, pásale ambos archivos.

## Tu rol
Construyes la **Caja Negra**: un servicio que registra en `audit_logs` cada acción importante (quién, qué, sobre qué, desde qué IP y si salió bien o mal). La entidad `AuditLog` ya la hiciste; ahora falta el **módulo** y el **servicio**.

Tu trabajo **desbloquea a dos personas**:
- **Kevin (Fase 3):** su `AuthGuard` registra los intentos fallidos (`AUTH_FAILED`).
- **Santiago (Fase 4):** cada operación sobre secretos se registra.

Como tu servicio lo usan dos personas, **la firma de `log()` no puede cambiar**.

## Tus archivos (solo estos)
| Archivo | Qué haces |
|---|---|
| `src/audit/auditLogEntity.ts` | Agregar el enum `AuditAction` y limpiar los TODOs |
| `src/audit/AuditService.ts` | Hoy está vacío: implementar `log()` y `findAll()` |
| `src/audit/audit.module.ts` | Hoy está vacío: registrar entidad y servicio, y **exportar el servicio** |
| `src/audit/audit.service.spec.ts` (nuevo, recomendado) | Prueba unitaria |
| `src/audit/audit.controller.ts` (nuevo, opcional, Fase 5) | `GET /audit-logs` de solo lectura |

**No toques** `app.module.ts`: tu módulo lo importan Auth y Secrets, no hace falta registrarlo en la raíz.

---

## FASE 2 — Audit module  ⏱ espera a que Kevin fusione la Fase 1

```bash
git checkout develop
git pull origin develop
git checkout -b feat/audit-module
npm install
cp .env.example .env      # completa los valores (ver plan general, sección 5)
docker compose up -d
```

### Paso 1. `auditLogEntity.ts`
1. Agrega y exporta el catálogo de acciones (**contrato con Kevin, Santiago y Marlon**):
   ```ts
   export enum AuditAction {
     AUTH_FAILED = 'AUTH_FAILED',
     CREATE_ENVIRONMENT = 'CREATE_ENVIRONMENT',
     CREATE_SECRET = 'CREATE_SECRET',
     READ_SECRET = 'READ_SECRET',
     READ_ALL_SECRETS = 'READ_ALL_SECRETS',
     UPDATE_SECRET = 'UPDATE_SECRET',
     DELETE_SECRET = 'DELETE_SECRET',
   }
   ```
   La columna `action` sigue siendo `varchar` (no la cambies a enum de BD: así se pueden agregar acciones sin migrar).
2. Cambia los tipos opcionales para que coincidan con columnas nullable:
   `target?: string` → `target: string | null;` e `ipAddress?: string` → `ipAddress: string | null;`
3. Borra los comentarios `// TODO: Crear columna…` que ya están resueltos (deja el encabezado que explica la Caja Negra).
4. Mantén `AuditStatus` y el alias `AuditLogStatus` tal cual.

### Paso 2. `AuditService.ts`
```ts
export interface AuditEntry {
  action: AuditAction;
  actor: string;
  status: AuditStatus;
  target?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(entry: AuditEntry): Promise<void> { ... }
  findAll(limit = 100): Promise<AuditLog[]> { ... }
}
```

**`log(entry)`** ← **contrato, no cambies la firma**
- Usa `this.auditRepository.insert({ ...entry, target: entry.target ?? null, ipAddress: entry.ipAddress ?? null })`. Usa `insert` y no `save`: así no hay forma de actualizar registros existentes.
- Envuelve todo en `try/catch`. Si falla, **no relances el error**: haz `this.logger.error('No se pudo registrar la auditoría', error)`. Motivo: si la auditoría falla, no debe tumbar la petición del usuario.
- **Nunca** guardes valores de secretos ni API keys en ningún campo. `target` es solo el **nombre** (`DB_PASSWORD`) o la ruta.

**`findAll(limit = 100)`**: `find({ order: { timestamp: 'DESC' }, take: limit })`.

**No implementes** métodos `update` ni `delete`. La Caja Negra es de solo inserción y lectura.

### Paso 3. `audit.module.ts`
```ts
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
```
Exportar `AuditService` es lo que permite a Kevin y a Santiago inyectarlo.

### Paso 4. Prueba unitaria (recomendado): `audit.service.spec.ts`
Con el repositorio mockeado (`getRepositoryToken(AuditLog)`):
- `log()` llama a `insert` con los datos correctos y `target`/`ipAddress` en `null` si no vienen.
- Si `insert` lanza error, `log()` **no** lanza (la promesa se resuelve).

### Paso 5. Probar que la tabla se crea
Como todavía nadie importa tu módulo, para probarlo en local agrega **temporalmente** `AuditModule` a `imports` de `app.module.ts`, arranca (`npm run start:dev`) y verifica:
```bash
docker compose exec db psql -U envault -c "\d audit_logs"
```
**Quita ese cambio antes del commit** (`app.module.ts` es de Kevin).

### Paso 6. Subir
```bash
npm run build
npm run lint
npm test
npm run format
```
PR `feat/audit-module` → `develop`. Revisor sugerido: **Kevin** o **Santiago**.
Al fusionar, avisa: **`✅ FASE 2 – Audit fusionado. AuditService.log() y AuditAction ya están en develop.`**

---

## Mientras esperas (Fases 3 y 4)
- Revisa el PR de Kevin (`feat/auth-guard`) y el de Santiago (`feat/secrets-crud`). Fíjate en que:
  - usen `AuditAction` y `AuditStatus` (no textos sueltos);
  - **ningún** `log()` incluya el valor de un secreto o una API key.
- Prepara la **colección de Postman o Thunder Client** para la demo (ver Fase 5).

---

## FASE 5 — Consulta de auditoría y demo  ⏱ espera a que Secrets (Santiago) esté fusionado

**Rama:** `feat/audit-demo`

1. **(Opcional) `audit.controller.ts`**: `GET /audit-logs?limit=50` que llama a `findAll`. Regístralo en `controllers` de `audit.module.ts`. Solo lectura: nada de POST, PUT ni DELETE.
2. **Colección de la demo** en `docs/enVault.postman_collection.json` (o un `docs/demo.http`) con este orden:
   1. Crear entorno PRODUCCION → guardar `apiKey` en una variable.
   2. Crear entorno QA → guardar `apiKey`.
   3. Guardar `DB_PASSWORD` en PRODUCCION.
   4. Leer `DB_PASSWORD` con la key de PRODUCCION → 200.
   5. Leer con la key de QA → 404.
   6. Leer sin key → 401.
   7. `GET /audit-logs` → se ven todos los intentos anteriores con `SUCCESS` y `FAILED`.
3. **Mini-backend de demostración** `docs/demo-cliente/index.js` (unas 15 líneas): al arrancar pide `GET /secrets` con `ENVAULT_API_KEY` y muestra por consola los nombres de las claves que recibió (no los valores).

Aviso: **`✅ FASE 5 – colección de demo lista en docs/.`**

---

## Checklist personal
- [ ] `AuditAction` exportado con las 7 acciones.
- [ ] `target` e `ipAddress` tipados como `string | null`.
- [ ] `AuditService.log()` usa `insert`, no lanza errores y no guarda secretos.
- [ ] `AuditModule` exporta `AuditService`.
- [ ] Sin métodos de update o delete.
- [ ] Build, lint y test pasan. PR fusionado y aviso enviado.
- [ ] F5: colección de demo (+ `GET /audit-logs` opcional).

## Notas para Claude
- `log(entry: AuditEntry): Promise<void>` es un contrato que usan Kevin, Santiago y Marlon: no cambies nombres de campos, no agregues campos obligatorios y no hagas que lance excepciones.
- No renombres `AuditService.ts` ni `auditLogEntity.ts` (decisión del equipo para evitar conflictos).
- No toques `app.module.ts` en el commit (solo de forma temporal para probar, y se revierte).
- La inmutabilidad se logra no exponiendo update/delete; no agregues triggers de BD en el MVP salvo que el usuario lo pida.
