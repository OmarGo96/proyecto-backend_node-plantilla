# GS Backend Node Plantilla 📗

Backend base para la gestión de recursos empresariales basado en el lengauje NodeJs.

## Descripción 🦥

Este proyecto es una API RESTful desarrollada en **Node.js** (v20.x) y **TypeScript** (v5.x) pensada como plantilla para futuros desarrollos backend. Incluye arquitectura modular, integración con Sentry, Sequelize como ORM, middlewares de seguridad y utilidades para despliegue profesional.

## Tecnologías y librerías principales 🛠

- **@aws-sdk/client-s3**: SDK oficial de AWS para almacenamiento de archivos en S3.
- **@aws-sdk/credential-providers**: Proveedores de credenciales AWS.
- **@sentry/cli** y **@sentry/node**: Monitoreo y reporte de errores.
- **axios**: Cliente HTTP para peticiones externas.
- **bcrypt**: Hash seguro de contraseñas.
- **body-parser**: Middleware para parsear cuerpos de peticiones.
- **colors**: Colorea la salida en consola.
- **cors**: Middleware para habilitar CORS.
- **dotenv**: Carga variables de entorno desde `.env`.
- **express**: Framework web principal.
- **express-fileupload**: Middleware para subida de archivos.
- **express-rate-limit**: Limita la cantidad de peticiones por IP.
- **express-useragent**: Detecta el user-agent de las peticiones.
- **helmet**: Seguridad HTTP.
- **jsonwebtoken**: Autenticación y autorización con JWT.
- **mariadb** y **mysql2**: Drivers para bases de datos relacionales.
- **mathjs**: Operaciones matemáticas avanzadas.
- **nodemailer** y **nodemailer-express-handlebars**: Envío de correos y plantillas.
- **read-excel-file** y **csv-parser**: Procesamiento de archivos Excel y CSV.
- **sequelize**: ORM para bases de datos SQL.
- **socket.io**: Comunicación en tiempo real.
- **validator**: Validación y saneamiento de datos.

## Estructura del proyecto 🪱

```
src/
  config/         # Configuración principal, base de datos, relaciones
  controllers/    # Controladores de rutas y lógica de negocio
  enums/          # Enumeraciones usadas en el sistema
  helpers/        # Funciones y utilidades auxiliares
  interfaces/     # Interfaces TypeScript para los modelos
  middlewares/    # Middlewares de Express
  models/         # Modelos Sequelize
  queries/        # Consultas y operaciones sobre la base de datos
  routes/         # Definición de rutas y agrupadores
  utils/          # Utilidades globales (logger, etc)
  server.ts       # Punto de entrada del servidor
```

## Instalación ⛩

1. Clona el repositorio:
   ```bash
   git clone https://github.com/GC-Sistemas/gs-backend_node-plantilla.git
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno en un archivo `.env` en la raíz del proyecto.

## Uso

- Compila el proyecto en modo watch:
  ```bash
  npx tsc -w
  ```

- Inicia el servidor de desarrollo:
  ```bash
  npm run dev
  ```
  o bien:
  ```bash
  nodemon dist/server.js
  ```

- El servidor estará disponible en `http://localhost:3000` (o el puerto configurado).

## Versiones #

- **TypeScript:** v5.x
- **Node.js:** v20.x o superior

> **Nota:** Todas las rutas pueden requerir autenticación JWT y permisos según el rol del usuario.

## Contribución

1. Haz un fork del repositorio.
2. Crea una rama para tu feature o fix.
3. Haz tus cambios y abre un Pull Request.

## Licencia ✅

MIT

---

**Desarrollado por OmarGo96 /
