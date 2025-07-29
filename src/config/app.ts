import 'dotenv/config'
import express from 'express'
import https from 'https'
import http from 'http'
import bodyParser from 'body-parser'
import cors from 'cors'
import helmet from 'helmet'
import fileUpload from 'express-fileupload'
import useragent from 'express-useragent'
import colors from 'colors';
import * as Sentry from "@sentry/node";
import { RouteManager } from '../routes/index.routes';
import { Database } from './database'
import InitializationRelationship from './relationships'

/**
 * Clase principal para la configuración y arranque del servidor Express.
 * 
 * Orquesta la inicialización completa de la aplicación backend incluyendo:
 * - Configuración de middlewares de seguridad (Helmet, CORS)
 * - Gestión de errores globales con Sentry
 * - Conexión y autenticación de base de datos
 * - Registro de rutas y controladores
 * - Configuración de protocolos HTTP/HTTPS
 * 
 * @class App
 * @description Clase singleton que maneja el ciclo de vida completo del servidor Express.
 * @version 1.0.0
 * @author OmarGo96
 * 
 * @example
 * // Inicialización manual (no recomendado, usar createServer):
 * const app = new App();
 * await app.initialize();
 * app.server.listen(3000, () => console.log('Servidor corriendo'));
 */
class App {
  /** Instancia principal de la aplicación Express */
  public app: express.Application;
  
  /** Middleware de CORS configurado para la aplicación */
  public cors: express.RequestHandler;
  
  /** Servidor HTTP o HTTPS según el entorno */
  public server: https.Server | http.Server;
  
  /** Gestor centralizado de todas las rutas de la aplicación */
  public routes: RouteManager = new RouteManager();
  
  /** Instancia estática de la base de datos (Singleton) */
  static database: Database = new Database();

  /**
   * Constructor de la clase App.
   * Realiza validaciones mínimas y prepara la instancia Express.
   * 
   * @constructor
   * @throws {Error} Si faltan variables de entorno críticas como SENTRY_DSN
   * 
   * @example
   * // Uso interno, preferir createServer()
   * const app = new App();
   */
  constructor() {
    // Validación de variables de entorno críticas
    if (!process.env.SENTRY_DSN) {
      throw new Error('Falta la variable de entorno SENTRY_DSN');
    }
    this.app = express();
  }

  /**
   * Inicializa Sentry para la gestión de errores globales y monitoreo.
   * Configura el SDK de Sentry con:
   * - DSN del proyecto para envío de errores
   * - Entorno actual (development, testing, production)
   * - Modo debug activado en desarrollo
   * 
   * @private
   * @method initSentry
   * @returns {void}
   * 
   * @example
   * // Configuración aplicada:
   * // - dsn: process.env.SENTRY_DSN
   * // - environment: process.env.MODE
   * // - debug: true en desarrollo, false en producción
   */
  private initSentry(): void {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.MODE,
      debug: (process.env.MODE != 'production') ? true : false
    });
  }

  /**
   * Configura el protocolo de seguridad del servidor.
   * Actualmente utiliza HTTP para todos los entornos.
   * 
   * @private
   * @method securityProtocol
   * @returns {void}
   * 
   * @todo Implementar HTTPS en producción con certificados SSL
   * @todo Añadir configuración automática de certificados Let's Encrypt
   * 
   * @example
   * // Protocolo actual: HTTP
   * // URL resultante: http://localhost:PORT
   */
  private securityProtocol(): void {
    this.server = http.createServer(this.app);
  }

  /**
   * Configura todos los middlewares globales de la aplicación.
   * Aplica en orden específico:
   * 1. Inicialización de relaciones de base de datos
   * 2. CORS para peticiones cross-origin
   * 3. User-Agent parsing para información del cliente
   * 4. File upload con límites de seguridad
   * 5. Helmet para cabeceras de seguridad
   * 6. Content Security Policy (CSP)
   * 7. Body parsing para JSON y URL-encoded
   * 
   * @private
   * @method config
   * @returns {void}
   * 
   * @security
   * - Límite de archivos: 100MB
   * - Límite de JSON: 50MB
   * - CSP configurado para prevenir XSS
   * - Nombres de archivos seguros activados
   * 
   * @example
   * // Middlewares aplicados:
   * // app.use(cors())
   * // app.use(fileUpload({ limits: { fileSize: 100MB } }))
   * // app.use(helmet())
   * // app.use(bodyParser.json({ limit: '50mb' }))
   */
  private config(): void {
    InitializationRelationship.init();
    this.app.use(cors());
    this.app.use(useragent.express());
    this.app.use(fileUpload({
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
      abortOnLimit: true,
      safeFileNames: true,
      preserveExtension: true
    }));
    this.app.use(helmet());
    this.app.use(helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    }));
    this.app.use(helmet.permittedCrossDomainPolicies());
    this.app.use(helmet.referrerPolicy({ policy: 'strict-origin' }));
    this.app.use(bodyParser.json({ limit: '50mb' }));
    this.app.use(bodyParser.urlencoded({ extended: false }));
  }

  /**
   * Inicializa la conexión a la base de datos y valida la autenticación.
   * Utiliza la instancia estática de Database para mantener una conexión singleton.
   * Muestra el resultado de la conexión en consola con colores.
   * 
   * @private
   * @async
   * @method initDatabase
   * @returns {Promise<void>}
   * @throws {Error} Si la conexión a la base de datos falla
   * 
   * @example
   * // Salida en consola:
   * // ✅ "Conexión a la base de datos establecida correctamente"
   * // ❌ "Error: No se pudo conectar a la base de datos"
   */
  private async initDatabase(): Promise<void> {
    try {
      const connection = await App.database.authenticate();
      console.log(colors.green(connection.message));
    } catch (error) {
      console.error(colors.red('Error al conectar con la base de datos:'), error);
      throw error;
    }
  }

  /**
   * Inicializa la aplicación completa en orden específico.
   * Secuencia de inicialización:
   * 1. Validación de variables de entorno críticas
   * 2. Creación de la instancia Express
   * 3. Configuración de Sentry para logging
   * 4. Configuración del protocolo de seguridad
   * 5. Aplicación de middlewares globales
   * 6. Inicialización y autenticación de base de datos
   * 7. Registro de rutas y controladores
   * 8. Configuración del manejador de errores de Sentry
   * 
   * @public
   * @async
   * @method initialize
   * @returns {Promise<void>}
   * @throws {Error} Si alguna etapa de inicialización falla
   * 
   * @example
   * const app = new App();
   * await app.initialize();
   * app.server.listen(3000);
   */
  async initialize(): Promise<void> {
    this.initSentry();
    this.securityProtocol();
    this.config();
    await this.initDatabase();
    this.routes.registerRoutes(this.app);
    Sentry.setupExpressErrorHandler(this.app);
  }
}

/**
 * Factory asíncrona para crear y configurar el servidor Express listo para usar.
 * 
 * Esta función garantiza que todas las dependencias críticas (middlewares, base de datos,
 * rutas, Sentry, etc.) estén inicializadas antes de exponer el servidor para listening.
 * 
 * @function createServer
 * @async
 * @returns {Promise<http.Server|https.Server>} Servidor Express configurado y listo para usar
 * 
 * @example
 * // En server.ts o index.ts:
 * import { createServer } from './config/app';
 * 
 * async function start() {
 *   const server = await createServer();
 *   server.listen(3000, () => {
 *     console.log('Servidor corriendo en puerto 3000');
 *   });
 * }
 * start();
 * 
 * @author OmarGo96
 */
export async function createServer(): Promise<http.Server | https.Server> {
  const appInstance = new App();
  await appInstance.initialize();
  return appInstance.server;
}