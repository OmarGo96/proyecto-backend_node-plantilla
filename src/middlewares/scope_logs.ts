import * as Sentry from "@sentry/node";
import { Response, Request, NextFunction } from 'express'

/**
 * Middleware para registrar información contextual de la petición en Sentry.
 * Permite rastrear detalles de la request en los logs de errores.
 */
export class SentryLogs {
    /**
     * Agrega información de la petición al contexto de Sentry para mejorar el rastreo de errores.
     * - Agrega tag de tipo, contexto de request y usuario (método, ruta, IP, navegador).
     * @param req Objeto Request de Express
     * @param res Objeto Response de Express
     * @param next Siguiente función middleware
     */
    /**
     * Middleware que agrega información relevante de la petición al contexto de Sentry.
     * Solo incluye datos básicos y seguros para evitar exponer información sensible.
     */
    static scope(req: Request, res: Response, next: NextFunction): void {
        Sentry.setTag("Type", "Request");
        // Solo loguea información básica, no todo el body
        Sentry.setContext("Request", {
            method: req.method,
            url: req.originalUrl,
            params: req.params,
            query: req.query
        });
        Sentry.setUser({
            ip_address: req.socket.remoteAddress || '',
            user_agent: req.headers['user-agent'] || ''
        });
        next();
    }
}