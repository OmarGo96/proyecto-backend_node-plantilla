# CHANGELOG.md

## [1.2.1] - 2025-07-29

### Corregido
- **payload.ts**:  
  - Se corrigió el tipado de la opción `expiresIn` en la generación de JWT para evitar errores de tipo en TypeScript (`string` ahora se castea correctamente a `string | number`).
  - Se mejoró la documentación JSDoc de todas las interfaces y métodos, detallando validaciones, seguridad y estructura de los datos.
  - Se reforzó la validación de los datos de entrada para los payloads de usuario y cliente.
  - Se documentó exhaustivamente el proceso de cifrado y firma de tokens JWT.
  - Se mantiene la integración con Sentry y el logging estructurado para monitoreo y debugging.

---

**Resumen:**  
Se han realizado mejoras de robustez y documentación en el helper de generación de tokens JWT (`payload.ts`), asegurando compatibilidad total con TypeScript y mayor claridad para desarrolladores y revisores.

---

## [1.2.0] - 2025-01-29

### Añadido
- Documentación completa JSDoc para todos los helpers del sistema.
- Mejoras en seguridad, validación y monitoreo en helpers principales.

---


## [1.0.0] - 2025-07-29

### Agregado
- Estructura inicial del proyecto backend Node.js con TypeScript y Express.
- Configuración de servidor Express con inicialización asíncrona y patrón factory (`createServer`).
- Integración de Sentry para monitoreo y reporte de errores.
- Logging estructurado y colorizado mediante `ServerLogger`.
- Configuración de middlewares de seguridad: Helmet, CORS, Content Security Policy.
- Soporte para subida de archivos con `express-fileupload`.
- Parsing de body con `body-parser` y análisis de user-agent.
- Configuración y autenticación de base de datos con Sequelize (MySQL/MariaDB).
- Gestión de rutas centralizada con `RouteManager`.
- Manejo robusto de errores globales (`uncaughtException`, `unhandledRejection`, advertencias y señales del sistema).
- Enum `JsonResponse` para códigos de respuesta HTTP comunes.
- Documentación exhaustiva con JSDoc en todas las clases, métodos y listeners.
- Scripts de testing con Jest y soporte para TypeScript.
- Estructura modular para fácil escalabilidad y mantenimiento.
- Ejemplos de uso y logs en la documentación.

---

**Autor:** Omar Gonzalez  
**Fecha:** 2025-07-29