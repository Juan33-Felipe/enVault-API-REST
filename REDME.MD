# enVault - Secure Configuration & Secrets Management API (Fase 1 - MVP)

> Plataforma API RESTful especializada en la centralización, protección y auditoría de variables de entorno y credenciales de software.

## 1. Contexto del Proyecto

En el desarrollo de software moderno, la gestión de la configuración es tan crítica como el código mismo. **enVault** nace como una herramienta de "DevOps Interno": un centro de control backend (API-First) diseñado para la comunicación Máquina a Máquina (M2M). Su propósito es permitir a las aplicaciones y sistemas recuperar su información sensible en tiempo de ejecución, eliminando la necesidad de exponer secretos en el código fuente.

---

## 2. El Problema a Resolver

A medida que las aplicaciones escalan, la administración descentralizada de la configuración genera vulnerabilidades críticas y caos operativo, manifestándose en tres áreas:

1. **Riesgos de Seguridad (Hardcoding):** Las variables de entorno, claves de bases de datos, tokens de APIs de pago y *prompts* de Inteligencia Artificial suelen quedar "quemados" (hardcoded) en el código fuente o dispersos en repositorios, siendo altamente vulnerables a filtraciones.
2. **Caos de Entornos:** No existe un aislamiento lógico estricto. Las credenciales de un entorno de Pruebas (QA) pueden mezclarse con las de Producción, provocando incidentes críticos.
3. **Falta de Trazabilidad:** Cuando una configuración falla o una contraseña es alterada, no existe un registro histórico que indique quién realizó el cambio, cuándo lo hizo y desde qué IP, dificultando la resolución de incidentes.

---

## 3. La Solución (Nuestra Propuesta)

enVault propone una arquitectura basada en dos conceptos fundamentales: una **Bóveda Privada** y una **Caja Negra**. En lugar de almacenar secretos en su código, las aplicaciones clientes se autentican contra la API de enVault al iniciar, solicitando sus credenciales de forma programática.

### Módulos Principales (Alcance Fase 1)

El sistema se divide en tres dominios de negocio encapsulados:

* **Módulo de Seguridad (SecretModule - La Bóveda):** 
  Motor criptográfico central. Recibe las contraseñas, las cifra utilizando algoritmos fuertes antes de guardarlas en la base de datos (cifrado en reposo) y las descifra únicamente cuando un cliente con la identidad correcta las solicita.
* **Módulo de Entornos (EnvironmentModule - El Aislamiento):** 
  Clasificador lógico que separa estrictamente las reglas y permisos. Asegura que una petición proveniente de un entorno de "Desarrollo" jamás pueda leer los secretos almacenados en la sección de "Producción".
* **Módulo de Auditoría (AuditModule - La Caja Negra):** 
  Sistema de trazabilidad pasivo e inmutable. Utilizando interceptores, vigila la bóveda y registra automáticamente en la base de datos cada intento de lectura, creación o mutación de un secreto, indicando el actor, la acción y el resultado final (Éxito/Fallo).

---

## 4. Stack Tecnológico

El proyecto está construido bajo los principios de Arquitectura Limpia (Clean Architecture) e Inyección de Dependencias, utilizando las siguientes tecnologías:

* **Framework Core:** NestJS (Node.js) + TypeScript.
* **Seguridad de Interfaz:** `class-validator` y `class-transformer` para sanitización de DTOs. AuthGuard para validación de tokens de acceso (M2M).
* **Persistencia (Bóveda y Caja Negra):** TypeORM y PostgreSQL.
* **Observabilidad:** Integración de telemetría y logs distribuidos mediante `@nestjs/observe` para el monitoreo avanzado del sistema.

---

## 5. Estructura del Código Fuente

La arquitectura de carpetas refleja la separación estricta de responsabilidades (Separation of Concerns) del MVP:

```text
src/
├── app.module.ts                  # Orquestador principal
├── main.ts                        # Bootstrap y configuración global de Pipes
├── common/                        # Recursos compartidos (Guards globales, Interceptors)
├── modules/
│   ├── auth/                      # Autenticación M2M (Validación de API Keys)
│   ├── audit/                     # Lógica de la caja negra (Registro inmutable)
│   ├── environment/               # Gestión de aislamiento lógico
│   └── secrets/                   # Bóveda de cifrado y descifrado
└── observe/                       # Configuración de instrumentación y telemetría