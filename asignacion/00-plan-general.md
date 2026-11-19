# enVault — Plan de trabajo general (MVP Fase 1)

> **Léelo antes de tocar código.** Este archivo explica cómo vamos a trabajar los 4. Cada persona tiene además su propia guía en esta carpeta.
> Si usas Claude (u otro asistente), pásale **este archivo y tu guía personal** antes de pedirle cualquier cambio.

| Integrante | Guía | Módulo principal |
|---|---|---|
| Kevin Stiven Buesaquillo | [01-kevin.md](01-kevin.md) | Base del proyecto + Auth (guard) + pruebas e2e |
| Marlon Alexander | [02-marlon.md](02-marlon.md) | Environments (El Aislamiento) |
| Juan Felipe Zambrano | [03-juan-felipe.md](03-juan-felipe.md) | Audit (La Caja Negra) |
| Santiago Rivas Tulcán | [04-santiago.md](04-santiago.md) | Encryption + Secrets (La Bóveda) |

---

## 1. Qué vamos a construir (versión mínima que funciona)

Una API REST en NestJS + TypeORM + PostgreSQL donde:

1. Se crea un **entorno** (`PRODUCCION`, `QA`, …) y la API devuelve **una API key** para ese entorno (solo se muestra una vez).
2. Con esa API key (header `x-api-key`) otro backend puede **guardar** secretos (se cifran con AES-256-GCM antes de ir a la BD) y **leerlos** (se descifran al devolverlos).
3. Una API key de un entorno **nunca** puede leer secretos de otro entorno.
4. Todo intento (éxito o fallo) queda registrado en la tabla `audit_logs`.

### Decisiones del MVP (no las cambies sin hablarlo con el equipo)

- **No hay tabla de clientes.** La API key vive en el propio entorno: columna `api_key_hash` en `environments`.
- **La API key se guarda hasheada (SHA-256)**, nunca en texto plano. Al crear el entorno se devuelve la key en claro una única vez.
- **Los secretos se cifran (AES-256-GCM), NO se hashean.** Un hash no se puede revertir y la bóveda necesita devolver el valor original.
- **Sin DTOs ni `class-validator`** por ahora: validaciones simples con `if` + `BadRequestException`.
- **`synchronize: true`** en TypeORM: las tablas se crean solas, sin migraciones.
- **Crear entornos queda abierto** (sin admin) para la demo. Se puede proteger después si sobra tiempo.
- **No renombrar archivos existentes** (`auditLogEntity.ts`, `AuditService.ts`, `environmentEntity.ts`, `secretEntity.ts`). Renombrar en paralelo genera conflictos; se hará al final si hay tiempo.
- **Se quita `@nestjs/observe`** del arranque (tenía claves de ejemplo escritas en el código). Queda como mejora futura.

### Endpoints finales

| Método | Ruta | Header | Quién lo hace |
|---|---|---|---|
| `POST` | `/environments` | — | Marlon |
| `GET` | `/environments` | — | Marlon |
| `POST` | `/secrets` | `x-api-key` | Santiago |
| `GET` | `/secrets` | `x-api-key` | Santiago |
| `GET` | `/secrets/:keyName` | `x-api-key` | Santiago |
| `PUT` | `/secrets/:keyName` (opcional) | `x-api-key` | Santiago |
| `DELETE` | `/secrets/:keyName` (opcional) | `x-api-key` | Santiago |

### Flujo de una petición

```text
Otro backend ── GET /secrets/DB_PASSWORD ── x-api-key: env_ab12...
      ▼
AuthGuard (Kevin)            → hashea la key → EnvironmentsService.findByApiKey() (Marlon)
      │                          ├─ no existe → AuditService.log(AUTH_FAILED) (Juan) → 401
      │                          └─ existe    → request.environment = entorno
      ▼
SecretsController (Santiago) → SecretsService.findOne(entorno, 'DB_PASSWORD')
      ▼                          busca SOLO dentro de entorno.id   ← aislamiento
EncryptionService (Santiago) → decrypt(encryptedValue)
      ▼
AuditService.log(READ_SECRET, SUCCESS) (Juan) → respuesta { keyName, value }
```

---

## 2. Contratos entre módulos (lo que cada uno promete entregar)

Estas firmas son **el acuerdo del equipo**. Puedes programar contra ellas aunque tu compañero/a todavía no haya terminado (usando un mock). **No cambies una firma sin avisar al grupo.**

### Kevin → todos (Fase 1)
- `ConfigModule` global: `ConfigService` disponible en cualquier módulo sin importarlo.
- `TypeOrmModule.forRootAsync(...)` con `autoLoadEntities: true` y `synchronize: true`.
- Variables de entorno (en `.env.example`):
  `PORT`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `ENCRYPTION_MASTER_KEY`.
- Archivo `src/auth/authenticated-request.ts`:
  ```ts
  import { Request } from 'express';
  import { Environment } from '../environments/environmentEntity';

  export interface AuthenticatedRequest extends Request {
    environment: Environment;
  }
  ```

### Marlon → Kevin (Fase 2)
`EnvironmentsModule` **exporta** `EnvironmentsService` con:
```ts
create(name: string, description?: string): Promise<{ environment: Environment; apiKey: string }>;
findAll(): Promise<Environment[]>;
findByApiKey(apiKey: string): Promise<Environment | null>; // recibe la key EN CLARO, hashea internamente
```

### Juan Felipe → Kevin y Santiago (Fase 2)
`AuditModule` **exporta** `AuditService` con:
```ts
log(entry: {
  action: AuditAction;
  actor: string;          // nombre del entorno, o 'anonymous'
  status: AuditStatus;    // SUCCESS | FAILED (ya existe en auditLogEntity.ts)
  target?: string;        // keyName o ruta afectada
  ipAddress?: string;
}): Promise<void>;        // NUNCA lanza error: si falla, solo hace console.error / Logger
```
Y el enum `AuditAction` exportado desde `src/audit/auditLogEntity.ts`:
`AUTH_FAILED`, `CREATE_ENVIRONMENT`, `CREATE_SECRET`, `READ_SECRET`, `READ_ALL_SECRETS`, `UPDATE_SECRET`, `DELETE_SECRET`.

### Santiago → Santiago (Fase 2 → Fase 4)
`EncryptionService` (provider de `SecretsModule`):
```ts
encrypt(plainText: string): string;   // devuelve "iv:authTag:cipherText" (cada parte en base64)
decrypt(payload: string): string;
```

### Kevin → Santiago (Fase 3)
`AuthModule` **exporta** `AuthGuard`. Si el guard deja pasar, `request.environment` contiene el entorno autenticado (tipo `AuthenticatedRequest`).

---

## 3. Fases y orden cronológico

```text
FASE 1  Kevin: base (config + BD + tests)              ── bloquea a todos
           │
FASE 2  ├─ Marlon:   Environments + apiKey   ─┐
        ├─ Juan:     Audit module/service    ─┼── en paralelo, no comparten archivos
        └─ Santiago: EncryptionService       ─┘
           │
FASE 3  Kevin: AuthGuard        (necesita Marlon + Juan fusionados)
           │
FASE 4  Santiago: Secrets       (necesita Encryption + AuthGuard + Audit)
           │
FASE 5  Todos: pruebas, demo y documentación (en paralelo)
```

| Fase | Quién | Espera a | Desbloquea a | Duración aprox. |
|---|---|---|---|---|
| 1 | Kevin | — | Todos | 1 día |
| 2 | Marlon, Juan, Santiago | Fase 1 fusionada | Kevin (F3), Santiago (F4) | 1–2 días |
| 3 | Kevin | Marlon y Juan fusionados | Santiago (F4) | 1 día |
| 4 | Santiago | Fase 3 + su propio Encryption | Todos (F5) | 1–2 días |
| 5 | Todos | Fase 4 fusionada | — | 1 día |

> **"Bloquear"** = no puedes seguir porque necesitas algo que otra persona aún no termina.
> **"Desbloquear"** = cuando tu PR se fusiona en `develop`, el siguiente ya puede trabajar.
> Mientras esperas, puedes adelantar trabajo con un **mock** (una versión falsa de lo que te falta que respete el contrato de la sección 2).

### ¿Qué hacer mientras esperas?
- **Fase 1 (Marlon, Juan, Santiago):** leer tu guía, revisar la documentación de NestJS de tu tema, instalar Docker/PostgreSQL.
- **Fase 3 (Marlon, Juan):** revisar el PR de Kevin; Marlon puede añadir el registro `CREATE_ENVIRONMENT` en la auditoría (ver su guía).
- **Fase 4 (Kevin, Marlon, Juan):** revisar el PR de Santiago, preparar la colección de Postman/Thunder y el mini-backend de demo.

---

## 4. Forma de trabajo con Git

**Rama de integración:** `develop`. Nadie hace commit directo a `develop`.

### Antes de empezar una fase
```bash
git checkout develop
git pull origin develop
git checkout -b <tu-rama>
npm install
```

### Mientras trabajas
- Commits pequeños con el formato `tipo(módulo): descripción`, por ejemplo:
  `feat(environments): genera api key al crear entorno`, `fix(auth): devuelve 401 sin header`.
- Si `develop` cambia mientras trabajas: `git pull origin develop` en tu rama y resuelve conflictos.

### Antes de abrir el Pull Request (obligatorio)
```bash
npm run build
npm run lint
npm test
npm run format
```
- El build y los tests **deben pasar**. Lint: cero avisos nuevos en tus archivos.
- Prueba tu parte con la app levantada (`npm run start:dev`) cuando aplique.
- **Nunca subas el archivo `.env`.** Solo `.env.example`.

### Pull Request
- Destino: `develop`. Título igual al formato de commit.
- En la descripción: qué hiciste, cómo probarlo y qué contrato cumple.
- Lo revisa **al menos una persona** distinta del autor (sugerido: quien depende de ese PR).
- Al fusionar, **avisa en el grupo** con este mensaje:
  `✅ FASE <n> – <módulo> fusionado en develop. Ya pueden hacer git pull.`

### Reglas para no pisarnos
1. **Solo modificas los archivos de tu guía.** Si necesitas cambiar un archivo de otra persona, avísale primero.
2. `app.module.ts` y `main.ts` solo los toca Kevin (Fase 1). Los demás módulos se conectan entre sí con `imports` en su propio `*.module.ts`.
3. Si un contrato de la sección 2 no te sirve, se discute en el grupo **antes** de cambiarlo.

---

## 5. Entorno local (después de la Fase 1)

1. Copia `.env.example` → `.env` y completa los valores.
2. Genera tu clave de cifrado:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Pégala en `ENCRYPTION_MASTER_KEY`. **Si la cambias, los secretos ya guardados no se podrán descifrar.**
3. Levanta PostgreSQL:
   ```bash
   docker compose up -d
   ```
4. Arranca la API:
   ```bash
   npm run start:dev
   ```

---

## 6. Definición de "terminado" del MVP

- [ ] `npm run build`, `npm run lint` y `npm test` pasan en `develop`.
- [ ] Se crea un entorno y se recibe su API key.
- [ ] Con esa key se guarda un secreto y en la BD aparece **cifrado** (no se lee el valor original).
- [ ] Con esa key se lee el secreto descifrado.
- [ ] Con la key de otro entorno, el mismo secreto devuelve **404**.
- [ ] Sin key o con una key falsa la respuesta es **401**.
- [ ] Todos los casos anteriores aparecen en `audit_logs` con `SUCCESS` o `FAILED`.
- [ ] Test e2e del flujo completo pasando.
- [ ] README actualizado con instrucciones para levantar el proyecto.

---

## 7. Instrucciones para Claude (u otro asistente de IA)

Si eres un asistente ayudando a un integrante de este equipo:

1. Lee este archivo completo y luego **solo** la guía del integrante con quien trabajas.
2. **Antes de escribir código**, verifica que las fases de las que depende la tarea ya estén en `develop`:
   `git fetch origin && git log origin/develop --oneline -15`. Si no lo están, díselo al usuario y propón trabajar con un mock que respete el contrato de la sección 2.
3. **Respeta los contratos** de la sección 2 al pie de la letra: nombres, firmas y tipos de retorno. Otro integrante está programando contra ellos al mismo tiempo.
4. **Modifica solo los archivos de la guía del integrante.** Si hace falta tocar otro archivo, detente y pregúntale.
5. **No renombres archivos**, no cambies `app.module.ts`/`main.ts` (salvo que la guía sea la de Kevin) y no agregues dependencias no mencionadas en la guía sin preguntar.
6. Estilo: TypeScript estricto, comillas simples, coma final (Prettier del proyecto), mensajes y comentarios en español.
7. Antes de dar la tarea por terminada, ejecuta `npm run build`, `npm run lint` y `npm test` y reporta el resultado real.
8. **No hagas commit, push ni abras PR** sin que el usuario lo pida. Nunca hagas commit de `.env`.
