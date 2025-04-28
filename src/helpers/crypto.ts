/** Library used to crypt an decrypt information than to share with external providers */
import crypto from 'crypto'
import fs from 'fs'
import moment from 'moment'
import * as Sentry from "@sentry/node";

export class Crypto {
    /** Request the data to crypt and the key to hash the information*/
    public crypt(data, public_key) {
        var buffer = Buffer.from(data)
        var encrypted = crypto.publicEncrypt(public_key, buffer)
        return encrypted.toString("base64")
    }
    /** Request the data to decrypt and the key to dishash */
    public decrypt(data, private_key) {
        var buffer = Buffer.from(data, 'base64')
        var encrypted = crypto.privateDecrypt(private_key, buffer)
        return encrypted.toString("utf8")
    }

    public async encryptInformation(data) {
        /** We use our public key to decript */
        let public_key: any
        if (process.env.MODE != 'dev') {
            public_key = fs.readFileSync(process.env.PUBLIC_KEY, 'utf8')
        } else {
            public_key = fs.readFileSync('./src/keys/private.pem', 'utf8')
        }

        try {
            //let string = 'MTIzNDU2Nzg5MTIzNDU2Nw=='
            let buffer = crypto.randomBytes(16)
            let key = crypto.publicEncrypt(public_key, buffer)
            var cipher = await Crypto.createCipheriv(buffer)
            var crypted = cipher.update(JSON.stringify(data))

            return { ok: true, key: key.toString('base64'), data: Buffer.concat([crypted, cipher.final()]).toString('base64') }
        } catch (e) {
            Sentry.captureException(e);
            console.log('Error encriptar info externo: ' + moment().format('YYYY-MM-DD HH:mm:ss') + ', ' + e)
            return { ok: false, message: 'Error al momento de encriptar información de proveedor externo' }
        }
    }

    /** Request data from Exotic */
    public async decryptInformation(key, data) {
        /** We use our private key to decript */
        let private_key: any
        if (process.env.MODE != 'dev') {
            private_key = fs.readFileSync(process.env.PRIVATE_KEY, 'utf8')
        } else {
            private_key = fs.readFileSync('./src/keys/private.pem', 'utf8')
        }

        try {
            var buffer = Buffer.from(key, 'base64')

            let clean_key = crypto.privateDecrypt(private_key, buffer)

            let decipheriv = await Crypto.createDecipheriv(clean_key)

            let decrypted = decipheriv.update(JSON.stringify(data), 'base64', 'utf8');
            decrypted += decipheriv.final('utf8')

            return { ok: true, data: JSON.parse(decrypted) }
        } catch (e) {
            Sentry.captureException(e);
            console.log('Error encriptar info externo: ' + moment().format('YYYY-MM-DD HH:mm:ss') + ', ' + e)
            return { ok: false, message: 'Error al momento de desencriptar información de proveedor externo' }
        }
    }

    private static async createDecipheriv(key) {
        return crypto.createDecipheriv(process.env.EAS_ALGORITHM, key, '')
    }

    private static async createCipheriv(key) {
        return crypto.createCipheriv(process.env.EAS_ALGORITHM, key, '')
    }

}