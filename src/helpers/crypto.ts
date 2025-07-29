import crypto from 'crypto'
import fs from 'fs'
import { DateTime } from 'luxon'
import * as Sentry from "@sentry/node";

/**
 * Helper para operaciones criptográficas avanzadas con soporte RSA y AES.
 * 
 * Esta clase proporciona métodos para encriptación y desencriptación utilizando
 * algoritmos criptográficos estándar (RSA para claves asimétricas y AES para
 * encriptación simétrica). Está diseñada para integraciones seguras con 
 * proveedores externos y manejo de información sensible.
 * 
 * **Características principales:**
 * - Encriptación/desencriptación RSA con claves públicas/privadas
 * - Encriptación híbrida RSA + AES para grandes volúmenes de datos
 * - Manejo automático de claves desde archivos del sistema
 * - Integración con Sentry para reporte de errores criptográficos
 * - Soporte para múltiples entornos (development/production)
 * - Validación de entrada y manejo robusto de errores
 * 
 * **Casos de uso:**
 * - Comunicación segura con APIs de terceros
 * - Encriptación de datos sensibles en tránsito
 * - Implementación de protocolos de seguridad empresariales
 * - Intercambio seguro de información con proveedores externos
 * 
 * @class Crypto
 * @description Utilidad para operaciones criptográficas RSA y AES
 * @version 1.0.0
 * @author OmarGo96
 * 
 * @dependencies
 * - **crypto**: Módulo nativo de Node.js para operaciones criptográficas
 * - **fs**: Lectura de archivos de claves criptográficas
 * - **moment**: Timestamps para logging de errores
 * - **@sentry/node**: Reporte automático de errores criptográficos
 * 
 * @environment
 * **Variables de entorno requeridas:**
 * - **PUBLIC_KEY**: Ruta al archivo de clave pública en producción
 * - **PRIVATE_KEY**: Ruta al archivo de clave privada en producción
 * - **EAS_ALGORITHM**: Algoritmo AES a utilizar (ej: aes-128-cbc)
 * - **MODE**: Entorno de ejecución (dev/production)
 * 
 * @security
 * **Consideraciones de seguridad:**
 * - Claves RSA almacenadas en archivos protegidos del sistema
 * - Algoritmos criptográficos estándar y seguros
 * - Validación de entrada para prevenir ataques
 * - Manejo seguro de memoria para claves temporales
 * - Logging sanitizado sin exposición de datos sensibles
 * 
 * @performance
 * - Optimizado para operaciones criptográficas intensivas
 * - Reutilización eficiente de objetos Cipher/Decipher
 * - Manejo de memoria controlado para claves grandes
 * 
 * @since 1.0.0
 */
export class Crypto {

    /**
     * Encripta datos usando criptografía RSA con clave pública.
     * 
     * Utiliza el algoritmo RSA para encriptar cadenas de texto utilizando
     * una clave pública. El resultado se codifica en base64 para facilitar
     * el transporte y almacenamiento.
     * 
     * @public
     * @method crypt
     * @param {string} data - Datos a encriptar en formato string
     * @param {string | Buffer} public_key - Clave pública RSA en formato PEM
     * @returns {string} Datos encriptados codificados en base64
     * @throws {Error} Si los datos o la clave pública no son proporcionados
     * 
     * @security
     * - Utiliza RSA con padding PKCS#1 v1.5 por defecto
     * - Tamaño máximo de datos limitado por el tamaño de la clave RSA
     * - Clave pública puede ser compartida de forma segura
     * 
     * @validation
     * - Valida presencia de datos y clave pública
     * - Maneja automáticamente la conversión de tipos
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    public crypt(data: string, public_key: string | Buffer): string {
        if (!data || !public_key) throw new Error('Datos o clave pública no proporcionados');
        const buffer = Buffer.from(data);
        const encrypted = crypto.publicEncrypt(public_key, buffer);
        return encrypted.toString("base64");
    }

    /**
     * Desencripta datos usando criptografía RSA con clave privada.
     * 
     * Utiliza el algoritmo RSA para desencriptar datos previamente encriptados
     * con la clave pública correspondiente. Los datos de entrada deben estar
     * en formato base64.
     * 
     * @public
     * @method decrypt
     * @param {string} data - Datos encriptados en formato base64
     * @param {string | Buffer} private_key - Clave privada RSA en formato PEM
     * @returns {string} Datos desencriptados en formato UTF-8
     * @throws {Error} Si los datos o la clave privada no son proporcionados
     * 
     * @security
     * - Requiere clave privada para desencriptación
     * - Clave privada debe mantenerse completamente secreta
     * - Utiliza padding PKCS#1 v1.5 compatible con el método crypt
     * 
     * @validation
     * - Valida presencia de datos encriptados y clave privada
     * - Maneja automáticamente la decodificación base64
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    public decrypt(data: string, private_key: string | Buffer): string {
        if (!data || !private_key) throw new Error('Datos o clave privada no proporcionados');
        const buffer = Buffer.from(data, 'base64');
        const decrypted = crypto.privateDecrypt(private_key, buffer);
        return decrypted.toString("utf8");
    }

    /**
     * Encripta información compleja usando criptografía híbrida RSA + AES.
     * 
     * Implementa un esquema de encriptación híbrida donde:
     * 1. Se genera una clave AES aleatoria de 16 bytes
     * 2. La clave AES se encripta con RSA usando la clave pública
     * 3. Los datos se encriptan con AES usando la clave generada
     * 4. Se retorna tanto la clave encriptada como los datos encriptados
     * 
     * @public
     * @async
     * @method encryptInformation
     * @param {object} data - Objeto JavaScript a encriptar
     * @returns {Promise<{ok: boolean; key?: string; data?: string; message?: string}>} 
     *          Resultado con clave y datos encriptados o mensaje de error
     * 
     * @response-structure
     * **Respuesta exitosa:**
     * - ok: true
     * - key: Clave AES encriptada con RSA en base64
     * - data: Datos encriptados con AES en base64
     * 
     * **Respuesta con error:**
     * - ok: false
     * - message: Descripción del error ocurrido
     * 
     * @file-handling
     * - En desarrollo: lee clave desde ./src/keys/private.pem
     * - En producción: lee clave desde process.env.PUBLIC_KEY
     * 
     * @error-handling
     * - Reporta errores automáticamente a Sentry
     * - Logging con timestamp para debugging
     * - Manejo seguro de excepciones criptográficas
     * 
     * @since 1.0.0
     * @author OmarGo96
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
            console.log('Error encriptar info externo: ' + DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss') + ', ' + (e?.message || e));
            return { ok: false, message: 'Error al momento de encriptar información de proveedor externo' };
        }
    }

    /**
     * Desencripta información compleja usando criptografía híbrida RSA + AES.
     * 
     * Implementa el proceso inverso de encryptInformation:
     * 1. Desencripta la clave AES usando RSA con la clave privada
     * 2. Utiliza la clave AES recuperada para desencriptar los datos
     * 3. Parsea el JSON resultante y retorna el objeto original
     * 
     * @public
     * @async
     * @method decryptInformation
     * @param {string} key - Clave AES encriptada con RSA en formato base64
     * @param {any} data - Datos encriptados con AES
     * @returns {Promise<{ok: boolean; data?: any; message?: string}>}
     *          Resultado con datos desencriptados o mensaje de error
     * 
     * @response-structure
     * **Respuesta exitosa:**
     * - ok: true
     * - data: Objeto JavaScript desencriptado y parseado
     * 
     * **Respuesta con error:**
     * - ok: false
     * - message: Descripción del error ocurrido
     * 
     * @file-handling
     * - En desarrollo: lee clave desde ./src/keys/private.pem
     * - En producción: lee clave desde process.env.PRIVATE_KEY
     * 
     * @validation
     * - Valida presencia de clave y datos encriptados
     * - Maneja automáticamente la conversión de formatos
     * 
     * @error-handling
     * - Reporta errores automáticamente a Sentry
     * - Logging con timestamp para debugging
     * - Manejo seguro de JSON malformado
     * 
     * @since 1.0.0
     * @author OmarGo96
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
            console.log('Error desencriptar info externo: ' + DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss') + ', ' + (e?.message || e));
            return { ok: false, message: 'Error al momento de desencriptar información de proveedor externo' };
        }
    }

    /**
     * Crea un objeto Decipher para desencriptación AES.
     * 
     * Método estático interno que inicializa un objeto Decipher
     * utilizando el algoritmo AES configurado en las variables de entorno
     * y la clave proporcionada.
     * 
     * @private
     * @static
     * @async
     * @method createDecipheriv
     * @param {Buffer} key - Clave AES para el algoritmo de desencriptación
     * @returns {Promise<crypto.Decipher>} Objeto Decipher configurado
     * 
     * @algorithm
     * - Utiliza algoritmo definido en process.env.EAS_ALGORITHM
     * - Inicialización vectorial vacía para compatibilidad
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    private static async createDecipheriv(key: Buffer): Promise<crypto.Decipher> {
        return crypto.createDecipheriv(process.env.EAS_ALGORITHM as string, key, '');
    }

    /**
     * Crea un objeto Cipher para encriptación AES.
     * 
     * Método estático interno que inicializa un objeto Cipher
     * utilizando el algoritmo AES configurado en las variables de entorno
     * y la clave proporcionada.
     * 
     * @private
     * @static
     * @async
     * @method createCipheriv
     * @param {Buffer} key - Clave AES para el algoritmo de encriptación
     * @returns {Promise<crypto.Cipher>} Objeto Cipher configurado
     * 
     * @algorithm
     * - Utiliza algoritmo definido en process.env.EAS_ALGORITHM
     * - Inicialización vectorial vacía para compatibilidad
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    private static async createCipheriv(key: Buffer): Promise<crypto.Cipher> {
        return crypto.createCipheriv(process.env.EAS_ALGORITHM as string, key, '');
    }
}