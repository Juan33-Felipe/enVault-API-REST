# Audit Module — Entity

**Branch:** `develop` · **Date:** 2026-10-29 · **Author:** Juan Felipe Zambrano

## What was added

`src/audit/auditLogEntity.ts` now defines the `AuditLog` TypeORM entity, which maps to the `audit_logs` table (the system's "Caja Negra" / immutable audit ledger).

| Property      | DB column     | Type                  | Constraints                                                                 |
|---------------|---------------|-----------------------|-----------------------------------------------------------------------------|
| `id`          | `id`          | `uuid`                | Primary key, auto-generated (`@PrimaryGeneratedColumn('uuid')`)             |
| `action`      | `action`      | `varchar(255)`        | `NOT NULL` (e.g. `CREATE_SECRET`, `READ_SECRET`, `DELETE_ENVIRONMENT`)     |
| `actor`       | `actor`       | `varchar(255)`        | `NOT NULL` (e.g. `backend_ventas_prod`, `admin_felipe`)                    |
| `target`      | `target`      | `varchar(255)`        | Nullable (e.g. name of the affected key or resource)                       |
| `status`      | `status`      | `enum`                | `NOT NULL`, restricted to `SUCCESS` or `FAILED` via `AuditStatus` enum      |
| `ipAddress`   | `ip_address`  | `varchar(255)`        | Nullable (client IP address)                                               |
| `timestamp`   | `timestamp`   | `timestamptz`         | Set automatically on insert (`CURRENT_TIMESTAMP`)                           |

## Decisions

- **TypeScript Enum (`AuditStatus`)**: Defined and exported `AuditStatus` enum with values `SUCCESS` and `FAILED`. Also exported `AuditLogStatus` as an alias to support both naming conventions across imports.
- **PostgreSQL Enum column**: The `status` column is configured with `{ type: 'enum', enum: AuditStatus }` to ensure strict database-level validation.
- **Column name `ip_address`**: Follows PostgreSQL `snake_case` database naming convention while keeping TypeScript property in camelCase (`ipAddress`), matching the convention seen in `book-nestjs-5a` (e.g. `lastName` -> `last_name`).
- **`timestamptz` with `CURRENT_TIMESTAMP`**: Mapped `timestamp` using `@CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })`, matching the timestamp pattern established in `book-nestjs-5a/src/users/entities/user.entity.ts`.
- **Immutability by design ("La Caja Negra")**: Following the architectural requirements in `README.MD`, audit records are insert-only to guarantee traceability; no `@UpdateDateColumn()` or deletion mechanisms were added.
- **Documentation integrity**: Preserved the original header documentation and inline TODOs to guide the rest of the team.

## Project status (found during review)

- `npm run build` fails on `develop`. The cause is outside the `audit` module:
  - `src/app.module.ts` imports `./nodes/nodes.module`, which does not exist.
  - `src/auth/auth.module.ts` is empty, so `AuthModule` is not exported.
- `TypeOrmModule.forRoot(...)` (PostgreSQL connection) is not yet configured in `AppModule`.
- `src/audit/AuditService.ts` is currently empty.
- An `audit.module.ts` file has not been created yet to register `TypeOrmModule.forFeature([AuditLog])`.
- `Secret` entity in `src/secrets/secretEntity.ts` still has pending TODOs.

## Next steps (audit module scope)

1. Create `src/audit/audit.module.ts` to import and export `TypeOrmModule.forFeature([AuditLog])`.
2. Implement `AuditService` in `src/audit/AuditService.ts` to inject `Repository<AuditLog>` and log events.
3. Build interceptors/guards to automatically capture and record security actions in the audit ledger.
