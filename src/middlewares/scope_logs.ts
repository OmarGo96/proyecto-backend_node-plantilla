import * as Sentry from "@sentry/node";
import { Response, Request, NextFunction } from 'express'

export class SentryLogs {
    static scope(req: Request, res: Response, next: NextFunction) {

        Sentry.setTag("Type", "Request")

        Sentry.setContext("Request", req.body)
        
        Sentry.setUser({
            method: req.method,
            path: req.originalUrl,
            ip: req.socket.remoteAddress,
            browser: req.headers['user-agent']
        });

        next()
    }
}