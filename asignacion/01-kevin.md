# Guía de Kevin Stiven Buesaquillo — Base del proyecto + Auth + e2e

> Lee primero [00-plan-general.md](00-plan-general.md). Si usas Claude, pásale ambos archivos.

## Tu rol
Eres quien **arranca y cierra** el trabajo:
- **Fase 1:** dejas la base lista (configuración, conexión a PostgreSQL, tests funcionando). **Bloqueas a todo el equipo** hasta que la fusiones, así que es lo más urgente.
- **Fase 3:** implementas el `AuthGuard`, la puerta de entrada que conecta Environments (Marlon) con Secrets (Santiago).
- **Fase 5:** escribes el test e2e del flujo completo.

## Tus archivos (solo estos)
| Archivo | Fase |
|---|---|
| `package.json`, `package-lock.json` | 1 |
| `tsconfig.json` | 1 |
| `.gitignore`, `.gitattributes` (nuevo), `.prettierrc` | 1 |
| `.env.example` (nuevo), `docker-compose.yml` (nuevo) | 1 |
| `src/app.module.ts`, `src/main.ts` | 1 |
| `src/auth/authenticated-request.ts` (nuevo) | 1 |
| `src/auth/auth.module.ts`, `src/auth/auth.guard.ts`, `src/auth/auth.service.ts` | 3 |
| `test/app.e2e-spec.ts`, `test/jest-e2e.json` | 5 |

---

## FASE 1 — Base del proyecto  ⏱ empieza ya · bloquea a todos

**Rama:** `chore/base-config`

### Paso 1. Dependencias
```bash
npm install @nestjs/config
```
`@nestjs/typeorm`, `typeorm` y `pg` ya están instalados. Aprovecha para correr `npm audit fix` (hay 3 vulnerabilidades altas en `body-parser`, `multer` y `qs`) y verifica que el build siga pasando.

### Paso 2. Arreglar los tests (hoy NO corren)
Hoy hay dos problemas, ya verificados:
1. TypeScript 6 exige `rootDir` → error `TS5011`.
2. NestJS 12 se publica como ESM y Jest no puede cargarlo sin `--experimental-vm-modules`.

Cambios:
- `tsconfig.json` → dentro de `compilerOptions` agrega `"rootDir": "."` (`tsconfig.build.json` ya lo sobrescribe con `./src` para el build, no lo toques).
- `package.json` → cambia los scripts de test para que usen Node con VM modules (funciona igual en Windows, Mac y Linux):
  ```json
  "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
  "test:watch": "node --experimental-vm-modules node_modules/jest/bin/jest.js --watch",
  "test:cov": "node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage",
  "test:e2e": "node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json"
  ```
- Verifica: `npm test` → `Tests: 1 passed`.

### Paso 3. Fin de línea y archivos generados
- `.prettierrc` → agrega `"endOfLine": "auto"` (hoy Prettier marca 8 archivos solo por CRLF de Windows).
- `.gitattributes` (nuevo) con la línea `* text=auto eol=lf`.
- `.gitignore` → agrega `*.tsbuildinfo` (el build genera `tsconfig.build.tsbuildinfo`).

### Paso 4. Variables de entorno
`.env.example` (este SÍ se sube; `.env` NO, ya está en `.gitignore`):
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=envault
DB_PASSWORD=envault
DB_NAME=envault
# 64 caracteres hex (32 bytes). Generar con:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_MASTER_KEY=
```

### Paso 5. PostgreSQL con Docker (para que todos tengan la misma BD)
`docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: envault
      POSTGRES_PASSWORD: envault
      POSTGRES_DB: envault
    ports:
      - '5432:5432'
    volumes:
      - envault_data:/var/lib/postgresql/data
volumes:
  envault_data:
```
Si alguien no tiene Docker, puede usar un PostgreSQL local con los mismos datos.

### Paso 6. `src/app.module.ts`
- **Quita** `createObserveModule`, `ObserveModule`, `ObserveInstrument` y las claves `'YOUR_APP_KEY'`/`'YOUR_APP_SECRET'`.
- Agrega:
  ```ts
  ConfigModule.forRoot({ isGlobal: true }),
  TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      type: 'postgres',
      host: config.get<string>('DB_HOST', 'localhost'),
      port: Number(config.get('DB_PORT', 5432)),
      username: config.get<string>('DB_USERNAME'),
      password: config.get<string>('DB_PASSWORD'),
      database: config.get<string>('DB_NAME'),
      autoLoadEntities: true,
      synchronize: true,
    }),
  }),
  ```
- Mantén `AuthModule`, `EnvironmentsModule` y `SecretsModule` en `imports`. **No agregues `AuditModule`**: lo importarán Auth y Secrets, así nadie más necesita tocar `app.module.ts`.

### Paso 7. `src/main.ts`
- Quita `ObserveInstrument` y el objeto `{ instrument: ... }`.
- Cambia `bootstrap();` por `void bootstrap();` (evita el aviso de promesa flotante).

### Paso 8. Contrato para Santiago: `src/auth/authenticated-request.ts`
```ts
import { Request } from 'express';
import { Environment } from '../environments/environmentEntity';

export interface AuthenticatedRequest extends Request {
  environment: Environment;
}
```

### Paso 9. Verificación
```bash
docker compose up -d
npm run build
npm run lint
npm test
npm run start:dev
```
✅ **Listo cuando** la app arranca sin errores y en PostgreSQL existen las tablas `environments` y `secrets` (hoy la app se cae con `Nest can't resolve dependencies of the EnvironmentRepository`, justo porque falta `forRoot`).
Para ver las tablas: `docker compose exec db psql -U envault -c "\dt"`.

### Paso 10. Subir
PR `chore/base-config` → `develop`. Pide revisión a cualquiera del equipo.
Al fusionar, avisa: **`✅ FASE 1 – base fusionada en develop. Ya pueden hacer git pull y empezar la Fase 2.`**

---

## Mientras esperas la Fase 2
- Revisa y fusiona los PRs de Marlon, Juan y Santiago (tú eres quien más necesita los dos primeros).
- Puedes adelantar el guard (Fase 3) en tu rama usando un **mock** de `EnvironmentsService.findByApiKey` y de `AuditService.log` con las firmas del plan general.

---

## FASE 3 — AuthGuard  ⏱ espera a que Marlon (Environments) y Juan (Audit) estén fusionados

**Rama:** `feat/auth-guard` (créala desde `develop` actualizado).
**Confirma antes de empezar:** en `develop` existen `EnvironmentsService.findByApiKey` y `AuditService.log`.

### `src/auth/auth.service.ts`
- Inyecta `EnvironmentsService`.
- Método:
  ```ts
  validateApiKey(apiKey: string): Promise<Environment | null>
  ```
  Si `apiKey` viene vacía devuelve `null`; si no, delega en `environmentsService.findByApiKey(apiKey)` (Marlon ya hace el hash por dentro).

### `src/auth/auth.guard.ts`
- Inyecta `AuthService` y `AuditService`.
- En `canActivate(context)` (async):
  1. `const request = context.switchToHttp().getRequest<AuthenticatedRequest>();`
  2. Lee `request.headers['x-api-key']` (Express pone los headers en minúscula). Si es un arreglo o no es texto, trátalo como ausente.
  3. `const environment = await this.authService.validateApiKey(apiKey);`
  4. Si no hay entorno:
     ```ts
     await this.auditService.log({
       action: AuditAction.AUTH_FAILED,
       actor: 'anonymous',
       status: AuditStatus.FAILED,
       target: request.originalUrl,
       ipAddress: request.ip,
     });
     throw new UnauthorizedException('API key inválida o ausente');
     ```
  5. Si hay entorno: `request.environment = environment; return true;`
- Elimina el `return true` temporal y los TODOs ya resueltos.
- **Nunca** guardes ni registres la API key en claro (ni en logs ni en `audit_logs`).

### `src/auth/auth.module.ts`
```ts
@Module({
  imports: [EnvironmentsModule, AuditModule],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
```

### Prueba rápida
Mientras Santiago no tenga su controller, protege temporalmente `GET /` en `app.controller.ts` con `@UseGuards(AuthGuard)` **solo en local, sin commitearlo**:
- Sin header → 401 y una fila `AUTH_FAILED` en `audit_logs`.
- Con la key que devuelve `POST /environments` → 200.

Opcional (recomendado): `src/auth/auth.guard.spec.ts` con mocks de `AuthService` y `AuditService` probando 401 sin key, 401 con key falsa y `true` con key válida.

### Subir
PR `feat/auth-guard` → `develop`. Revisor sugerido: **Santiago** (es quien lo usará).
Aviso: **`✅ FASE 3 – AuthGuard fusionado. Santiago puede empezar Secrets.`**

---

## Mientras esperas la Fase 4
- Revisa el PR de Santiago.
- Prepara el esqueleto del test e2e.

---

## FASE 5 — Test e2e del flujo completo  ⏱ espera a que Secrets (Santiago) esté fusionado

**Rama:** `test/e2e-flujo`

Reescribe `test/app.e2e-spec.ts` (necesita la BD de Docker levantada y el `.env` con `ENCRYPTION_MASTER_KEY`):
1. `POST /environments` `{ name: 'E2E_PROD_<timestamp>' }` → guarda `apiKeyProd`.
2. `POST /environments` `{ name: 'E2E_QA_<timestamp>' }` → guarda `apiKeyQa`.
3. `POST /secrets` con `apiKeyProd` `{ keyName: 'DB_PASSWORD', value: 'superSecreta123' }` → 201.
4. `GET /secrets/DB_PASSWORD` con `apiKeyProd` → 200 y `value === 'superSecreta123'`.
5. `GET /secrets/DB_PASSWORD` con `apiKeyQa` → **404** (aislamiento).
6. `GET /secrets/DB_PASSWORD` sin header → **401**.
7. (Opcional) Consulta el repositorio de `Secret` y verifica que `encryptedValue !== 'superSecreta123'`.

Usa nombres con timestamp para poder correr el test varias veces sin choques de `UNIQUE`.
Al final ejecuta `npm run format` sobre todo el proyecto y corrige los avisos de lint que queden.

Aviso: **`✅ FASE 5 – e2e pasando en develop.`**

---

## Checklist personal
- [ ] F1: `@nestjs/config`, `rootDir`, scripts de test, `.env.example`, `docker-compose.yml`, `forRootAsync`, Observe eliminado, `authenticated-request.ts`.
- [ ] F1: la app arranca y crea las tablas; `npm test` pasa. PR fusionado y aviso enviado.
- [ ] F2: revisé los PRs de Marlon, Juan y Santiago.
- [ ] F3: el guard devuelve 401 y registra `AUTH_FAILED`; con key válida inyecta `request.environment`. PR fusionado y aviso enviado.
- [ ] F5: e2e con los 6 casos pasando.

## Notas para Claude
- En la Fase 1 sí puedes modificar `app.module.ts`, `main.ts`, `package.json` y `tsconfig.json`; en las Fases 3 y 5 no.
- Los scripts de test con `--experimental-vm-modules` y `rootDir: "."` ya se probaron en esta máquina (Node 26, Jest 30, NestJS 12): el test unitario pasa. No cambies a otra solución sin motivo.
- No crees una entidad de clientes ni JWT: el MVP usa la API key del entorno (plan general, sección 1).
- La firma de `AuditService.log` y de `EnvironmentsService.findByApiKey` está en la sección 2 del plan general; si en `develop` difieren, avisa al usuario en lugar de adaptarlas tú.
