# enVault - Secure Configuration & Secrets Management API (Fase 1 - MVP)

> Plataforma API RESTful especializada en la centralización, protección y auditoría de variables de entorno y credenciales de software.

[Contexto](#contexto-del-proyecto) · [Instalación](#instalación) · [Endpoints](#endpoints) · [Demostración en Postman](#demostración-en-postman) · [Arquitectura](#arquitectura)

## Contexto del proyecto

En el desarrollo de software moderno, la gestión de la configuración es tan crítica como el código mismo. **enVault** nace como una herramienta de "DevOps Interno": un centro de control backend (API-First) diseñado para la comunicación Máquina a Máquina (M2M). Su propósito es permitir a las aplicaciones y sistemas recuperar su información sensible en tiempo de ejecución, eliminando la necesidad de exponer secretos en el código fuente.

## El problema a resolver

A medida que las aplicaciones escalan, la administración descentralizada de la configuración genera vulnerabilidades críticas y caos operativo, manifestándose en tres áreas:

1. **Riesgos de Seguridad (Hardcoding):** Las variables de entorno, claves de bases de datos, tokens de APIs de pago y *prompts* de Inteligencia Artificial suelen quedar "quemados" (hardcoded) en el código fuente o dispersos en repositorios, siendo altamente vulnerables a filtraciones.
2. **Caos de Entornos:** No existe un aislamiento lógico estricto. Las credenciales de un entorno de Pruebas (QA) pueden mezclarse con las de Producción, provocando incidentes críticos.
3. **Falta de Trazabilidad:** Cuando una configuración falla o una contraseña es alterada, no existe un registro histórico que indique quién realizó el cambio, cuándo lo hizo y desde qué IP, dificultando la resolución de incidentes.

## La solución

enVault propone una arquitectura basada en dos conceptos fundamentales: una **Bóveda Privada** y una **Caja Negra**. En lugar de almacenar secretos en su código, las aplicaciones clientes se autentican contra la API de enVault al iniciar, solicitando sus credenciales de forma programática.

### Módulos Principales (Alcance Fase 1)

El sistema se divide en tres dominios de negocio encapsulados:

* **Módulo de Seguridad (SecretsModule – La Bóveda):**
  Motor criptográfico central. Recibe las contraseñas, las cifra utilizando algoritmos fuertes antes de guardarlas en la base de datos (cifrado en reposo) y las descifra únicamente cuando un cliente con la identidad correcta las solicita.
* **Módulo de Entornos (EnvironmentsModule – El Aislamiento):**
  Clasificador lógico que separa estrictamente las reglas y permisos. Asegura que una petición proveniente de un entorno de "Desarrollo" jamás pueda leer los secretos almacenados en la sección de "Producción".
* **Módulo de Auditoría (AuditModule – La Caja Negra):**
  Sistema de trazabilidad que registra en PostgreSQL operaciones de lectura, creación, actualización y eliminación de secretos, además de intentos fallidos de autenticación. Los servicios y el guard invocan a `AuditService` para registrar el actor, la acción y el resultado.

## Stack tecnológico

| Tecnología | Uso en enVault |
| --- | --- |
| NestJS, Node.js y TypeScript | API REST organizada en módulos, controladores y servicios con inyección de dependencias. |
| `class-validator` y `class-transformer` | Validación y transformación de datos de entrada mediante DTO. |
| TypeORM y PostgreSQL | Persistencia de entornos, secretos cifrados y registros de auditoría. |
| `node:crypto` | Generación de claves, hash SHA-256 de las API keys y cifrado AES-256-GCM de secretos. |
| Docker Compose | Ejecución local de PostgreSQL. |
| Jest y Supertest | Pruebas unitarias y de integración. |

El proyecto declara `@nestjs/observe` como dependencia. La auditoría implementada en esta versión se registra en PostgreSQL mediante `AuditService`.

## Requisitos

- Git, Node.js 24.15 o una versión posterior de la serie 24, y npm.
- Docker con Docker Compose para iniciar PostgreSQL 17. También puedes usar una instancia de PostgreSQL existente.
- Postman o Insomnia para probar la API.

## Instalación

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone --branch develop https://github.com/Juan33-Felipe/enVault-API-REST.git
cd enVault-API-REST
npm ci
```

### 2. Configurar la base de datos y la clave maestra

Copia `.env.example` a `.env` en la raíz del proyecto. Los valores iniciales coinciden con los del servicio `db` de Docker Compose.

| Variable | Valor local | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Puerto de la API. |
| `DB_HOST` | `localhost` | Servidor de PostgreSQL. |
| `DB_PORT` | `5432` | Puerto de PostgreSQL. |
| `DB_USERNAME` | `envault` | Usuario de la base de datos. |
| `DB_PASSWORD` | `envault` | Contraseña local del usuario. |
| `DB_NAME` | `envault` | Nombre de la base de datos. |
| `ENCRYPTION_MASTER_KEY` | Obligatoria | Clave de 32 bytes representada por 64 caracteres hexadecimales. |

Genera la clave, copia el resultado en `ENCRYPTION_MASTER_KEY` y conserva esa misma clave para leer los secretos guardados. Mantén `.env` fuera del repositorio.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Inicia PostgreSQL desde la raíz del proyecto.

```bash
docker compose up -d db
```

Si usas una instancia existente, crea una base de datos y configura en `.env` un usuario con permisos para crear tablas. TypeORM sincroniza el esquema al iniciar la API en esta versión del proyecto.

### 3. Iniciar la API

```bash
npm run start:dev
```

Abre [http://localhost:3000](http://localhost:3000). La ruta raíz devuelve `200 OK` y el texto `Hello World!`.

## Endpoints

| Método | Ruta | Acceso | Resultado |
| --- | --- | --- | --- |
| GET | `/` | Público | `200` · Comprueba que la API responde. |
| POST | `/environments` | Público | `201` · Crea un entorno y entrega su `apiKey` una sola vez. |
| GET | `/environments` | Público | `200` · Lista los entornos sin claves ni hashes. |
| POST | `/secrets` | `x-api-key` | `201` · Crea un secreto y devuelve sus metadatos. |
| GET | `/secrets` | `x-api-key` | `200` · Lista los nombres y valores descifrados del entorno. |
| GET | `/secrets/:keyName` | `x-api-key` | `200` · Devuelve el nombre y el valor descifrado de un secreto. |
| PUT | `/secrets/:keyName` | `x-api-key` | `200` · Reemplaza y cifra el valor del secreto. |
| DELETE | `/secrets/:keyName` | `x-api-key` | `204` · Elimina el secreto y devuelve una respuesta sin cuerpo. |

Las peticiones con cuerpo JSON usan `Content-Type: application/json`. Para acceder a la bóveda, envía la clave del entorno en el encabezado `x-api-key`. El entorno se identifica a partir de esa clave.

| Código | Cuándo se devuelve |
| --- | --- |
| `400 Bad Request` | Campos faltantes, adicionales o con formato inválido. |
| `401 Unauthorized` | Clave ausente o inválida al acceder a `/secrets`. |
| `404 Not Found` | El secreto no existe en el entorno autenticado. |
| `409 Conflict` | Ya existe un entorno con ese nombre o un secreto con ese nombre en el mismo entorno. |
| `500 Internal Server Error` | Entre otros errores internos, se devuelve si falla el descifrado de un secreto. |

## Demostración en Postman

La [colección de Postman](https://github.com/Juan33-Felipe/enVault-API-REST/blob/docs/postman-collection/pruebas-postman/enVault-prueba-completa.postman_collection.json) se encuentra en la rama `docs/postman-collection`. Descarga el archivo JSON, impórtalo en Postman y ejecuta la colección en el orden original, ya que las solicitudes posteriores reutilizan las claves generadas al crear los entornos. La variable `baseUrl` debe coincidir con la dirección de la API.

### Recorrido manual

1. Envía `POST /environments` y copia la `apiKey` de la respuesta. Si ya existe `demo`, usa otro nombre.

   ```json
   {
     "name": "demo",
     "description": "Entorno para la sustentación"
   }
   ```

2. Añade la clave al encabezado `x-api-key` y envía `POST /secrets` con datos de prueba.

   ```json
   {
     "keyName": "DEMO_TOKEN",
     "value": "valor-de-prueba"
   }
   ```

3. Consulta `GET /secrets/DEMO_TOKEN` y comprueba que `value` coincide con el valor enviado.
4. Envía `PUT /secrets/DEMO_TOKEN` con `{"value":"valor-actualizado"}` y vuelve a consultar el secreto.
5. Repite la consulta sin clave para obtener `401`. Crea un segundo entorno y consulta con su clave para comprobar que devuelve `404`.
6. Elimina el secreto con la clave original mediante `DELETE /secrets/DEMO_TOKEN` y confirma el `204`. Una consulta posterior debe devolver `404`.

### Verificación del cifrado y la auditoría

Antes de eliminar el secreto de prueba, comprueba que PostgreSQL almacena su valor cifrado. La segunda consulta muestra los eventos de auditoría registrados por el servicio interno.

```bash
docker compose exec db psql -U envault -d envault -c "SELECT key_name, encrypted_value FROM secrets WHERE key_name = 'DEMO_TOKEN';"
docker compose exec db psql -U envault -d envault -c "SELECT action, actor, target, status, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 20;"
```

## Arquitectura

El proyecto usa NestJS y TypeScript. Los controladores reciben las peticiones HTTP, los servicios aplican las reglas de negocio y los repositorios de TypeORM acceden a PostgreSQL. NestJS enlaza estas dependencias a través de sus módulos.

| Módulo | Responsabilidad |
| --- | --- |
| [Entornos](src/environments) | Crea y lista entornos. Genera una API key por entorno y almacena su hash SHA-256. |
| [Autenticación](src/auth) | Valida `x-api-key` mediante `AuthGuard` y asocia el entorno autenticado a la solicitud. |
| [Secretos](src/secrets) | Gestiona los secretos del entorno autenticado y cifra sus valores con AES-256-GCM antes de persistirlos. |
| [Auditoría](src/audit) | Registra operaciones de la bóveda e intentos fallidos de autenticación con acción, actor, resultado, fecha y, cuando están disponibles, objetivo e IP. Excluye los valores de los secretos. |

El `ValidationPipe` global valida los cuerpos y parámetros definidos por los DTO mediante `class-validator` y `class-transformer`. Los nombres de secretos se normalizan a mayúsculas y admiten letras de la A a la Z, dígitos y guion bajo, con un máximo de 150 caracteres. TypeORM persiste las entidades en las tablas `environments`, `secrets` y `audit_logs`.

### Estructura del código fuente

| Ubicación | Contenido |
| --- | --- |
| [src/main.ts](src/main.ts) | Inicio de NestJS y configuración de la validación global. |
| [src/app.module.ts](src/app.module.ts) | Módulo raíz y conexión con PostgreSQL. |
| [src/app.controller.ts](src/app.controller.ts) y [src/app.service.ts](src/app.service.ts) | Controlador y servicio de la ruta raíz. |
| [src/auth/](src/auth) | Módulo, servicio y guard de autenticación por API key. |
| [src/audit/](src/audit) | Módulo, servicio y entidad de auditoría. |
| [src/environments/](src/environments) | Módulo, controlador, servicio, entidad y DTO de entornos. |
| [src/secrets/](src/secrets) | Módulo, controlador, servicios de secretos y cifrado, entidad y DTO. |
| [test/](test) | Prueba de integración de la ruta raíz. |

## Pruebas y compilación

| Comando | Propósito |
| --- | --- |
| `npm test` | Ejecuta las pruebas unitarias de Jest. |
| `npm run test:e2e` | Ejecuta la prueba de integración de la ruta raíz. Requiere PostgreSQL activo y el archivo `.env` configurado. |
| `npm run build` | Compila el proyecto. |
| `npm run lint` | Revisa el código con Oxlint. |
