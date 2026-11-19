# Prueba completa de enVault en Postman

Colección: `enVault-prueba-completa.postman_collection.json`. Son 38 peticiones con 56 comprobaciones automáticas, que recorren toda la API en orden.

## 1. Levantar la API
```bash
colima start
docker compose up -d
npm run start:dev
```
Espera el mensaje `Nest application successfully started`.

## 2. Importar la colección (solo la primera vez)
En Postman: **Import** → arrastra `enVault-prueba-completa.postman_collection.json`.

## 3. Ejecutarla
Clic derecho sobre **enVault API — prueba completa** → **Run collection** → **Run**.
No cambies el orden: cada paso usa las API keys que guardan los anteriores.

Resultado esperado: **todas en verde** (56 passed, 0 failed).

Se puede repetir las veces que quieras: cada ejecución crea entornos nuevos con un sufijo único (por ejemplo `PRODUCCION_MI4X2K`), así que **no hace falta vaciar la base de datos**.

## Qué demuestra cada carpeta
| Carpeta | Qué prueba |
|---|---|
| 1. Entornos | Crear entornos, cada uno con su API key; listarlos sin exponer la key ni su hash; 409 si ya existe; 400 por DTO |
| 2. Seguridad | Sin API key o con una falsa → 401 (AuthGuard) |
| 3. Bóveda: CRUD | Crear (POST), leer descifrado (GET), listar, rotar (PUT) y leer el valor nuevo |
| 4. Validaciones | 400 por DTO (keyName inválido, sin value, campos extra, :keyName inválido), 409 duplicado, 404 inexistente |
| 5. Aislamiento | QA no puede ver, leer, rotar ni borrar los secretos de PRODUCCION (404); el mismo nombre puede existir en los dos entornos con valores distintos |
| 6. Limpieza | Borrar (DELETE → 204) y comprobar que ya no existen |

## Evidencias extra para la expo (fuera de Postman)
Después de ejecutar las carpetas 1 a 3 (antes de la limpieza), en la terminal:

Los secretos están **cifrados** en la base de datos:
```bash
docker compose exec db psql -U envault -c "select key_name, encrypted_value from secrets;"
```

La **auditoría** registró cada acción:
```bash
docker compose exec db psql -U envault -c "select action, actor, target, status from audit_logs order by timestamp;"
```

## Si algo falla
- **Todas fallan:** la API no está corriendo o no está en `http://localhost:3000` (variable `baseUrl` de la colección).
- **Fallan solo las marcadas "(DTO)":** el código no tiene los PRs de DTOs fusionados (`chore/validation-pipe`, `feat/environments-dto`, `feat/secrets-dto`).
