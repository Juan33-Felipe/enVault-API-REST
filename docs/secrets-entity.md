# Secrets Module — Entity

**Branch:** `feacture-santiago` · **Date:** 2026-10-29 · **Author:** Santiago

## What was added

`src/secrets/secretEntity.ts` now defines the `Secret` TypeORM entity, which maps to the `secrets` table.

| Property         | DB column         | Type            | Constraints                                         |
|------------------|-------------------|-----------------|-----------------------------------------------------|
| `id`             | `id`              | `uuid`          | Primary key, auto-generated                         |
| `keyName`        | `key_name`        | `varchar(150)`  | `NOT NULL` (e.g. `DB_PASSWORD`, `OPENAI_PROMPT_V1`) |
| `encryptedValue` | `encrypted_value` | `text`          | `NOT NULL`. Encrypted value only, never plain text  |
| `environment`    | `environment_id`  | `uuid` (FK)     | `NOT NULL`, → `environments.id`, `ON DELETE RESTRICT` |
| `createdAt`      | `created_at`      | `timestamp`     | Set automatically on insert                         |
| `updatedAt`      | `updated_at`      | `timestamp`     | Updated automatically on every save                 |

Composite unique constraint `UQ_secrets_key_name_environment` on (`key_name`, `environment_id`).

## Decisions

- **`text` for `encryptedValue`**: encrypted output (and AI prompts) can be long, so no length limit.
- **Unique per environment, not global**: `DB_PASSWORD` can exist in `QA` and in `PRODUCCION`, but only once in each.
- **`ON DELETE RESTRICT`**: an environment that still has secrets can't be deleted. This avoids silently losing secrets through a cascade.
- **`@ManyToOne` without an inverse side**: TypeORM accepts a `@ManyToOne` with no `@OneToMany` counterpart, so this works without touching `environments`. The verified metadata generates the `environment_id` FK correctly. A TODO in the entity marks where to add `(secret) => secret.environment` once `Environment.secrets` exists.
- **snake_case columns**: `key_name`, `encrypted_value`, `environment_id`, `created_at`, `updated_at`, the same convention as `environments`.
- **Import path**: the entity imports from `../environments/environmentEntity` (the real file name), not `environment.entity.ts` as the old TODO said.

## Module registration

`src/secrets/secrets.module.ts` now imports `TypeOrmModule.forFeature([Secret])` and re-exports `TypeOrmModule`, so services can inject `Repository<Secret>`.

> As with `environments`, the app won't start until `TypeOrmModule.forRoot(...)` is configured in `AppModule`.

## Verification

- `tsc --noEmit`: no errors in `src/secrets/`. The only errors are the existing ones in `app.module.ts` (missing `NodesModule`, `AuthModule` not exported).
- TypeORM metadata built without a DB connection:
  ```
  secrets: id:uuid, key_name:varchar, encrypted_value:text, created_at:timestamp, updated_at:timestamp, environment_id:uuid
  FK: environment_id -> environments  onDelete=RESTRICT
  UQ: UQ_secrets_key_name_environment(key_name, environment_id)
  ```

## Scope

Only `src/secrets/` and this doc were changed. No other module was touched.

## Next steps (outside the `secrets` entity scope, not done)

1. In `environments`: add `@OneToMany(() => Secret, (secret) => secret.environment) secrets: Secret[]`, then add the inverse callback in `Secret`.
2. `EncryptionService`, `SecretsService` and `SecretsController` (encrypt before saving, decrypt only for authorized reads).
3. Fix `app.module.ts` (remove `NodesModule`, export `AuthModule`) and configure `TypeOrmModule.forRoot`.
