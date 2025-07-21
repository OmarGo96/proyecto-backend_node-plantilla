import crypto from 'crypto'
import fs from 'fs'
import moment from 'moment'
import * as Sentry from "@sentry/node";

export class Crypto {
    /**
     * Encripta datos usando una clave pública.
     * @param data - Datos a encriptar (string)
     * @param public_key - Clave pública (string o Buffer)
     * @returns Cadena en base64 con los datos encriptados
     */
    /**
     * Encripta datos usando una clave pública.
     * @param data - Datos a encriptar (string)
     * @param public_key - Clave pública (string o Buffer)
     * @returns Cadena en base64 con los datos encriptados
     */
    public crypt(data: string, public_key: string | Buffer): string {
        if (!data || !public_key) throw new Error('Datos o clave pública no proporcionados');
        const buffer = Buffer.from(data);
        const encrypted = crypto.publicEncrypt(public_key, buffer);
        return encrypted.toString("base64");
    }

    /**
     * Desencripta datos usando una clave privada.
     * @param data - Datos encriptados en base64
     * @param private_key - Clave privada (string o Buffer)
     * @returns Cadena desencriptada en utf8
     */
    /**
     * Desencripta datos usando una clave privada.
     * @param data - Datos encriptados en base64
     * @param private_key - Clave privada (string o Buffer)
     * @returns Cadena desencriptada en utf8
     */
    public decrypt(data: string, private_key: string | Buffer): string {
        if (!data || !private_key) throw new Error('Datos o clave privada no proporcionados');
        const buffer = Buffer.from(data, 'base64');
        const decrypted = crypto.privateDecrypt(private_key, buffer);
        return decrypted.toString("utf8");
    }

    /**
     * Encripta información para proveedores externos usando una clave pública.
     * @param data - Objeto a encriptar
     * @returns Objeto con estado, clave y datos encriptados o mensaje de error
     */
    /**
     * Encripta información para proveedores externos usando una clave pública.
     * @param data - Objeto a encriptar
     * @returns Objeto con estado, clave y datos encriptados o mensaje de error
     */
    public async encryptInformation(data: object): Promise<{ ok: boolean; key?: string; data?: string; message?: string }> {
        let public_key: string;
        try {
            public_key = process.env.MODE != 'dev'
                ? fs.readFileSync(process.env.PUBLIC_KEY as string, 'utf8')
                : fs.readFileSync('./src/keys/private.pem', 'utf8');
            if (!data) throw new Error('No se proporcionó información a encriptar');

            const buffer = crypto.randomBytes(16);
            const key = crypto.publicEncrypt(public_key, buffer);
            const cipher = await Crypto.createCipheriv(buffer);
            const crypted = cipher.update(JSON.stringify(data));

            return {
                ok: true,
                key: key.toString('base64'),
                data: Buffer.concat([crypted, cipher.final()]).toString('base64')
            };
        } catch (e: any) {
            Sentry.captureException(e);
            console.log('Error encriptar info externo: ' + moment().format('YYYY-MM-DD HH:mm:ss') + ', ' + (e?.message || e));
            return { ok: false, message: 'Error al momento de encriptar información de proveedor externo' };
        }
    }

    /**
     * Desencripta información recibida de proveedores externos usando una clave privada.
     * @param key - Clave encriptada en base64
     * @param data - Datos encriptados
     * @returns Objeto con estado, datos desencriptados o mensaje de error
     */
    /**
     * Desencripta información recibida de proveedores externos usando una clave privada.
     * @param key - Clave encriptada en base64
     * @param data - Datos encriptados
     * @returns Objeto con estado, datos desencriptados o mensaje de error
     */
    public async decryptInformation(key: string, data: any): Promise<{ ok: boolean; data?: any; message?: string }> {
        let private_key: string;
        try {
            private_key = (process.env.MODE != 'dev')
                ? fs.readFileSync(process.env.PRIVATE_KEY as string, 'utf8')
                : fs.readFileSync('./src/keys/private.pem', 'utf8');

            if (!key || !data) throw new Error('Clave o datos no proporcionados');
            
            const buffer = Buffer.from(key, 'base64');
            const clean_key = crypto.privateDecrypt(private_key, buffer);
            const decipheriv = await Crypto.createDecipheriv(clean_key);
            let decrypted = decipheriv.update(data, 'base64', 'utf8');
            decrypted += decipheriv.final('utf8');
            return { ok: true, data: JSON.parse(decrypted) };
        } catch (e: any) {
            Sentry.captureException(e);
            console.log('Error desencriptar info externo: ' + moment().format('YYYY-MM-DD HH:mm:ss') + ', ' + (e?.message || e));
            return { ok: false, message: 'Error al momento de desencriptar información de proveedor externo' };
        }
    }

    /**
     * Crea un objeto Decipher para desencriptar información con el algoritmo y clave proporcionados.
     * @param key - Clave para el algoritmo de desencriptado
     * @returns Objeto Decipher
     */
    /**
     * Crea un objeto Decipher para desencriptar información con el algoritmo y clave proporcionados.
     * @param key - Clave para el algoritmo de desencriptado
     * @returns Objeto Decipher
     */
    private static async createDecipheriv(key: Buffer): Promise<crypto.Decipher> {
        return crypto.createDecipheriv(process.env.EAS_ALGORITHM as string, key, '');
    }

    /**
     * Crea un objeto Cipher para encriptar información con el algoritmo y clave proporcionados.
     * @param key - Clave para el algoritmo de encriptado
     * @returns Objeto Cipher
     */
    /**
     * Crea un objeto Cipher para encriptar información con el algoritmo y clave proporcionados.
     * @param key - Clave para el algoritmo de encriptado
     * @returns Objeto Cipher
     */
    private static async createCipheriv(key: Buffer): Promise<crypto.Cipher> {
        return crypto.createCipheriv(process.env.EAS_ALGORITHM as string, key, '');
    }
}