import express from 'express';
import rateLimit from 'express-rate-limit';
import { ExampleRoutes } from './example.routes';
import { SentryLogs } from '../middlewares/scope_logs';

/**
 * Clase principal para la gestión centralizada de rutas de la aplicación.
 * Se encarga de configurar middlewares globales, rate limiting y registrar
 * todos los módulos de rutas de la aplicación.
 * 
 * @class RouteManager
 * @description Administrador central de rutas con middlewares de seguridad
 * @version 1.0.0
 * @author OmarGo96
 */
export class RouteManager {
    /** Router principal que contiene todas las rutas de la aplicación */
    private router: express.Router;

    /**
     * Inicializa el router principal y configura middlewares globales.
     * Aplica en orden:
     * 1. Middleware de logging para Sentry
     * 2. Rate limiting para prevenir abuso
     * 3. Registro de todas las rutas de módulos
     * 
     * @constructor
     * @description Configura automáticamente todos los middlewares y rutas
     */
    constructor() {
        this.router = express.Router();

        // Middleware para logging y contexto de Sentry
        this.router.use(SentryLogs.scope);

        // Aplicar rate limiting para prevenir ataques de fuerza bruta
        this.router.use(this.limiter());

        // Registrar todas las rutas de módulos
        this.router.use(new ExampleRoutes().router);
    }

    /**
     * Configura el middleware de rate limiting para toda la aplicación.
     * Limita el número de peticiones por IP en una ventana de tiempo específica.
     * 
     * @private
     * @method limiter
     * @description Previene ataques DDoS y abuso de la API
     * @returns {express.RequestHandler} Middleware de rate limiting configurado
     * 
     * @example
     * // Configuración actual:
     * // - Ventana: 15 minutos
     * // - Máximo: 100 peticiones por IP
     * // - Mensaje: Error personalizado al exceder límite
     */
    private limiter(): express.RequestHandler {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // Límite de 100 peticiones por IP
            message: 'Demasiadas peticiones desde esta IP, intenta más tarde.',
            standardHeaders: true, // Retorna rate limit info en los headers `RateLimit-*`
            legacyHeaders: false // Deshabilita los headers `X-RateLimit-*`
        });
    }

    /**
     * Registra el router principal en la aplicación Express.
     * Monta todas las rutas bajo el prefijo '/api'.
     * 
     * @public
     * @method registerRoutes
     * @description Método público para integrar las rutas en la app principal
     * @param {express.Application} app - Instancia de la aplicación Express
     * @returns {void}
     * 
     * @example
     * // Uso en app.ts:
     * const routeManager = new RouteManager();
     * routeManager.registerRoutes(app);
     * 
     * // Esto hace que todas las rutas estén disponibles bajo:
     * // http://localhost:3000/api/example
     * // http://localhost:3000/api/example/users
     * // etc.
     */
    public registerRoutes(app: express.Application): void {
        app.use('/api', this.router);
    }
}