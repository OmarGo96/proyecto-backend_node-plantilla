import 'dotenv/config'
import express from 'express'
import https from 'https'
import http from 'http'
import bodyParser from 'body-parser'
import cors from 'cors'
import helmet from 'helmet'
import fileUpload from 'express-fileupload'
import useragent from 'express-useragent'
import InitializationRelationship from './relationships'
import { Routes } from '../routes/routes'
import { Database } from './database'
import * as Sentry from "@sentry/node";

/**
 * Clase principal para la configuración y arranque del servidor Express.
 * Configura middlewares de seguridad, CORS, carga de archivos, base de datos y Sentry.
 */
class App {
  public app: express.Application;
  public cors: express.RequestHandler;
  public server: https.Server | http.Server;
  public routes: Routes = new Routes();
  static database: Database = new Database();

  /**
   * Inicializa la aplicación, protocolos, middlewares, base de datos y rutas.
   */
  constructor() {
    // Validación de variables de entorno críticas
    if (!process.env.SENTRY_DSN) {
      throw new Error('Falta la variable de entorno SENTRY_DSN');
    }
    this.app = express();
    this.securityProtocol();
    this.config();
    this.database();
    this.routes.routes(this.app);
    Sentry.setupExpressErrorHandler(this.app);
    this.debug();
  }
  /** Creamos el motor principal del servidor */

  /**
   * Configura middlewares de seguridad, CORS, carga de archivos y parseo de body.
   */
  /**
   * Configura middlewares de seguridad, CORS, carga de archivos y parseo de body.
   */
  private config(): void {
    InitializationRelationship.init();
    this.app.use(cors());
    this.app.use(useragent.express());
    // Limitar tamaño y tipo de archivos subidos
    this.app.use(fileUpload({
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
      abortOnLimit: true,
      safeFileNames: true,
      preserveExtension: true
    }));
    // Helmet con Content Security Policy
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
   * Configura el protocolo HTTP para el servidor.
   */
  private securityProtocol(): void {
    this.server = http.createServer(this.app);
  }

  /**
   * Valida la conexión a la base de datos y muestra el estado en consola.
   */
  private async database() {
    let connection = await App.database.connection()
    console.log(connection.message)
  }

  /**
   * Inicializa Sentry para la gestión de errores globales.
   */
  private debug() {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.MODE,
      debug: (process.env.MODE != 'production') ? true : false
    });
  }
}

export default new App().server
