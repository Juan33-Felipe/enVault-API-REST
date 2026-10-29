# Environments Module — Entity

**Branch:** `feat/marlon` · **Date:** 2026-10-29 · **Author:** Marlon Alexander

## What was added

`src/environments/environmentEntity.ts` now defines the `Environment` TypeORM entity, which maps to the `environments` table.

| Property      | DB column     | Type                  | Constraints                         |
|---------------|---------------|-----------------------|-------------------------------------|
| `id`          | `id`          | `uuid`                | Primary key, auto-generated         |
| `name`        | `name`        | `varchar(100)`        | `NOT NULL`, `UNIQUE` (e.g. `PRODUCCION`, `QA`) |
| `description` | `description` | `varchar(255)`        | Nullable                            |
| `createdAt`   | `created_at`  | `timestamp`           | Set automatically on insert         |

## Decisions

- **Unique `name`**: two environments can't share a name, so `PRODUCCION` and `QA` stay separate.
- **`description: string | null`**: the TypeScript type matches the nullable column.
- **Column name `created_at`**: snake_case in the database and camelCase in code.
- **`@OneToMany` → `Secret` is not added yet.** `Secret` has no `@ManyToOne environment` side yet (it's still a TODO in `src/secrets/secretEntity.ts`). If only one side of the relation exists, TypeORM fails when the DataSource starts. A TODO in the entity marks where to add it:
  ```ts
  @OneToMany(() => Secret, (secret) => secret.environment)
  secrets: Secret[];
  ```

## Project status (found during review)

- `npm run build` fails on `develop`. The cause is outside `environments`:
  - `src/app.module.ts` imports `./nodes/nodes.module`, which was deleted in `e638f40`.
  - `src/auth/auth.module.ts` is empty, so `AuthModule` isn't exported.
- `TypeOrmModule.forRoot(...)` (PostgreSQL connection) is not configured in `AppModule` yet.
- The `Secret` and `AuditLog` entities, `AuditService.ts`, and the controllers and services are still TODOs.
- File naming doesn't match: the README and `secretEntity.ts` refer to `environment.entity.ts`, but the actual file is `environmentEntity.ts`.

## Module registration

`src/environments/environments.module.ts` now imports `TypeOrmModule.forFeature([Environment])` and re-exports `TypeOrmModule`. This lets services in this module, and in modules that import it, inject `Repository<Environment>`.

> The app won't start until `TypeOrmModule.forRoot(...)` is configured in `AppModule`, because `forFeature` needs a DataSource.

## Next steps (outside the `environments` scope, not done)

1. Fix `app.module.ts` (remove `NodesModule`) and export `AuthModule`.
2. Configure `TypeOrmModule.forRoot` in `AppModule`.
3. Implement `Secret.environment` (`@ManyToOne`) and then add `Environment.secrets` (`@OneToMany`).
