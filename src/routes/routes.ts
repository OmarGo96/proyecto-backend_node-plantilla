import express from 'express'

/** Importamos todos los controladores disponibles */
import { ExampleController } from '../controllers/example.controller'

/** Importamos todos los middlewares disponibles: */
import { CheckHeaders } from '../middlewares/headers'
import { SentryLogs } from '../middlewares/scope_logs'

export class Routes {
    public exampleController: ExampleController = new ExampleController()

    public routes(app: express.Application): void {
        /** Adjuntamos el tipo de petición que debe mandar el cliente para acceder
         *  al recurso: GET, POST, PUT, ETC 
        */
        /** Middleware que afecta a todas las rutas */
        //app.all('*', SentryLogs.scope)

        app.route('/api/example')
            .get(/*En esta parte agregamos los middlewares que sean necesarios, ejemplo: CheckHeaders.validateClientJWT*,*/ this.exampleController.example)
        app.route('/api/users')
            .get(this.exampleController.users)
        app.route('/api/aws/s3/upload')
            .get(this.exampleController.awsS3Upload)
        app.route('/api/aws/s3/download')
            .get(this.exampleController.awsS3Download)
        app.route('/api/aws/s3/destroy')
            .get(this.exampleController.awsS3Destroy)

        /* app.get("/debug-sentry", function mainHandler(req, res) {
            throw new Error("My first Sentry error!");
        }); */
    }
}