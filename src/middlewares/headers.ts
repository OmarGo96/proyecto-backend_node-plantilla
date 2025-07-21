import fs from 'fs'
import jwt from 'jsonwebtoken'
import Cryptr from 'cryptr'
import { Response, Request, NextFunction } from 'express'

/**
 * Middleware para validación de cabeceras de autenticación en peticiones HTTP.
 * Incluye validación de JWT y pruebas de cabecera personalizada.
 */
export class CheckHeaders {

    /**
     * Valida el JWT presente en la cabecera Authorization.
     * Si es válido, agrega el user_id desencriptado al body de la petición.
     * @param req Objeto Request de Express
     * @param res Objeto Response de Express
     * @param next Siguiente función middleware
     */
    static validateJWT(req: Request, res: Response, next: NextFunction) {

        let token = req.get('Authorization')
        let public_key = (process.env.MODE != 'dev') ? 
        fs.readFileSync(process.env.PUBLIC_KEY, 'utf8') : 
        fs.readFileSync('./src/keys/public.pem', 'utf8')

        let cryptr = new Cryptr(process.env.CRYPTR_KEY)
        try {
            let decoded: any = jwt.verify(token, public_key)

            if (!decoded.user_id) {
                return res.status(403).json({
                    ok: false,
                    errors: [{ message: 'You do not have the required authentication' }]
                })
            }

            let user_id = cryptr.decrypt(decoded.user_id)
            req.body.user_id = +user_id

        } catch (e) {
            return res.status(403).json({
                ok: false,
                errors: [{ message: 'Existe el siguiente problema con la cabecera: ' + e }]
            })
        }
        next()
    }

    /**
     * Middleware de prueba para validar un token estático en la cabecera Authorization.
     * @param req Objeto Request de Express
     * @param res Objeto Response de Express
     * @param next Siguiente función middleware
     */
    static test(req: Request, res: Response, next: NextFunction) {
        let token = req.get('Authorization')

        if (token == null) {
            return res.status(403).json({
                ok: false,
                errors: [{ message: 'La cabecera de autenticación no puede ser nula' }]
            })
        }

        if (token != 'TEST123') {
            return res.status(403).json({
                ok: false,
                errors: [{ message: 'La cabecera de autenticación no es valida' }]
            })
        }
        next()
    }
}
