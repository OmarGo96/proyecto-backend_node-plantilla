import jwt from 'jsonwebtoken'
import fs from 'fs'
import moment from 'moment'
import Cryptr from 'cryptr'
import * as Sentry from "@sentry/node";


/**
 * Clase para la generación de tokens JWT firmados y cifrado de identificadores de usuario.
 */
export class Payload {

    /**
     * Crea un token JWT firmado y cifra el user_id usando Cryptr.
     * @param data Objeto que debe contener la propiedad user_id
     * @returns Objeto con el token generado o error
     */
    public createToken(data) {
        try {
            let private_key: any = (process.env.MODE != 'dev') ? fs.readFileSync(process.env.PRIVATE_KEY, 'utf8') : 
            fs.readFileSync('./src/keys/private.pem', 'utf8')

            let cryptr = new Cryptr(process.env.CRYPTR_KEY)

            const user_id = cryptr.encrypt((data.user_id))

            let token = jwt.sign({
                user_id: user_id,
            }, private_key, { algorithm: 'RS256', expiresIn: '9h' })

            return { ok: true, token }

        } catch (e) {
            Sentry.captureException(e);
            console.log('Error payload a las: ' + moment().format('YYYY-MM-DD HH:mm:ss') + ', ' + e)
            return { ok: false }
        }
    }
}
