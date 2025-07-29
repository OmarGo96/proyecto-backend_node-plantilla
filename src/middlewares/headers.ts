import fs from 'fs'
import jwt from 'jsonwebtoken'
import Cryptr from 'cryptr'
import { Response, Request, NextFunction } from 'express'
import { JsonResponse } from 'src/enums/jsonResponse';

/**
 * Extiende la interfaz Request de Express para incluir propiedades personalizadas.
 * Permite acceso tipado a datos de usuario autenticado sin modificar el body original.
 * 
 * @interface AuthenticatedRequest
 * @extends {Request}
 * @description Extensión de Request con propiedades de autenticación
 * 
 * @example
 * // Uso en controladores después de la validación JWT:
 * const userId = (req as AuthenticatedRequest).userId;
 */
interface AuthenticatedRequest extends Request {
    /** ID numérico del usuario autenticado extraído del JWT */
    userId?: number;
}

/**
 * Middleware especializado para validación de cabeceras de autenticación en peticiones HTTP.
 * Proporciona métodos estáticos para validar tokens JWT con encriptación RSA y AES,
 * así como validaciones de cabeceras personalizadas para desarrollo y testing.
 * 
 * Características principales:
 * - Validación de tokens JWT con verificación de firma RSA
 * - Desencriptación segura de user_id usando AES (Cryptr)
 * - Carga optimizada de clave pública (una sola vez al inicio)
 * - Soporte para formato Bearer y Authorization directo
 * - Manejo robusto de errores sin exposición de detalles internos
 * - Middleware de testing para desarrollo
 * 
 * @class CheckHeaders
 * @description Middleware estático para autenticación y validación de cabeceras HTTP
 * @version 1.0.0
 * @author OmarGo96
 * 
 * @example
 * // Proteger rutas con JWT:
 * import { CheckHeaders } from '../middlewares/headers';
 * router.get('/protected', CheckHeaders.validateJWT, controller.method);
 * 
 * @example
 * // Proteger todas las rutas de un módulo:
 * router.use(CheckHeaders.validateJWT);
 * 
 * @example
 * // Usar middleware de test en desarrollo:
 * if (process.env.NODE_ENV === 'development') {
 *   router.use('/test', CheckHeaders.test);
 * }
 * 
 * @security
 * - Tokens JWT verificados con clave pública RSA
 * - User ID encriptado con AES antes de almacenar en JWT
 * - No exposición de detalles internos de errores en producción
 * - Validación de existencia de configuraciones críticas
 * 
 * @performance
 * - Carga de clave pública optimizada (una sola vez)
 * - Validaciones tempranas para fallar rápido
 * - Uso eficiente de memoria sin instanciación de clase
 */
export class CheckHeaders {
    
    /** 
     * Clave pública RSA cargada una sola vez para optimizar rendimiento.
     * Se carga automáticamente al inicializar la clase según el entorno:
     * - Desarrollo: Lee desde archivo local './src/keys/public.pem'
     * - Producción: Lee desde variable de entorno PUBLIC_KEY
     * 
     * @private
     * @static
     * @type {string}
     * @description Clave pública RSA para verificación de tokens JWT
     * 
     * @throws {Error} Si la variable PUBLIC_KEY no está definida en entornos no-dev
     * 
     * @example
     * // La clave se carga automáticamente:
     * // - En desarrollo: fs.readFileSync('./src/keys/public.pem', 'utf8')
     * // - En producción: fs.readFileSync(process.env.PUBLIC_KEY, 'utf8')
     * 
     * @performance
     * - Carga única al inicio de la aplicación
     * - Evita lecturas de archivo en cada petición
     * - Mejora significativa en throughput de autenticación
     * 
     * @security
     * - Clave pública RSA para verificación criptográfica
     * - Almacenamiento seguro en variables de entorno en producción
     * - Separación de claves por entorno (dev/prod)
     */
    private static publicKey: string = (() => {
        const path = (process.env.MODE !== 'dev')
            ? process.env.PUBLIC_KEY
            : './src/keys/public.pem';
        if (!path) throw new Error('PUBLIC_KEY no definida en variables de entorno');
        return fs.readFileSync(path, 'utf8');
    })();

    /**
     * Middleware principal para validación de tokens JWT en cabeceras de autenticación.
     * 
     * Proceso de validación:
     * 1. Extrae token de cabecera Authorization (soporta Bearer y formato directo)
     * 2. Verifica configuración de encriptación (CRYPTR_KEY)
     * 3. Valida firma del JWT usando clave pública RSA
     * 4. Verifica existencia de user_id en payload del JWT
     * 5. Desencripta user_id usando AES y lo anexa a la petición
     * 6. Continúa al siguiente middleware si todo es válido
     * 
     * @static
     * @public
     * @method validateJWT
     * @description Middleware de autenticación JWT con desencriptación de user_id
     * @param {Request} req - Objeto Request de Express con cabeceras de autenticación
     * @param {Response} res - Objeto Response de Express para envío de errores
     * @param {NextFunction} next - Función callback para continuar al siguiente middleware
     * @returns {void} No retorna valor, continúa la cadena o envía respuesta de error
     * 
     * @example
     * // Aplicar a rutas específicas:
     * router.get('/profile', CheckHeaders.validateJWT, UserController.getProfile);
     * 
     * @example
     * // Aplicar a todo un módulo de rutas:
     * router.use(CheckHeaders.validateJWT);
     * router.get('/users', UserController.list);     // Protegida
     * router.post('/users', UserController.create);  // Protegida
     * 
     * @example
     * // Formato de cabecera soportado:
     * // Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
     * // Authorization: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
     * 
     * @example
     * // Acceso al userId en controladores:
     * export const getProfile = (req: Request, res: Response) => {
     *   const userId = (req as AuthenticatedRequest).userId;
     *   // userId está disponible y es de tipo number
     * };
     * 
     * @responses
     * @status 401 - No se encontró token en cabecera Authorization
     * @status 500 - Configuración de servidor incompleta (falta CRYPTR_KEY)
     * @status 403 - Token inválido, expirado o sin user_id
     * 
     * @example
     * // Respuesta de error 401:
     * // {
     * //   ok: false,
     * //   errors: [{ message: "No se encontró el token de autenticación en la cabecera." }]
     * // }
     * 
     * @example
     * // Respuesta de error 403:
     * // {
     * //   ok: false,
     * //   errors: [{ message: "Token inválido o expirado." }]
     * // }
     * 
     * @security
     * - **Verificación RSA**: Token verificado con clave pública RSA
     * - **Desencriptación AES**: user_id desencriptado con Cryptr
     * - **No exposición**: Detalles de errores JWT no expuestos en producción
     * - **Validaciones**: Múltiples capas de validación antes de autorizar
     * 
     * @performance
     * - **Clave pública cached**: No se lee archivo en cada petición
     * - **Validaciones tempranas**: Falla rápido si no hay token
     * - **Una instancia Cryptr**: Creada solo cuando es necesaria
     * - **Async friendly**: Compatible con middlewares asíncronos
     * 
     * @flow
     * 1. **Extracción**: Token desde Authorization header
     * 2. **Verificación**: JWT signature con clave pública RSA
     * 3. **Validación**: Existencia de user_id en payload
     * 4. **Desencriptación**: user_id con AES usando Cryptr
     * 5. **Anexado**: userId numérico a req object
     * 6. **Continuación**: next() para siguiente middleware
     * 
     * @dependencies
     * - **jsonwebtoken**: Para verificación de firma JWT
     * - **cryptr**: Para desencriptación AES del user_id
     * - **fs**: Para lectura de clave pública RSA
     * 
     * @throws No lanza excepciones - todos los errores se manejan internamente
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    static validateJWT(req: Request, res: Response, next: NextFunction) {
        // Extraer token de cabecera Authorization con soporte para Bearer
        const authHeader = req.get('authorization') || req.get('Authorization');
        if (!authHeader) {
            return res.status(JsonResponse.UNAUTHORIZED).json({
                ok: false,
                errors: [{ message: 'No se encontró el token de autenticación en la cabecera.' }]
            });
        }

        // Soporte para formato Bearer y token directo
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

        // Verificar configuración de encriptación
        if (!process.env.CRYPTR_KEY) {
            return res.status(JsonResponse.INTERNAL_SERVER_ERROR).json({
                ok: false,
                errors: [{ message: 'Configuración de servidor incompleta.' }]
            });
        }

        // Inicializar desencriptador AES
        const cryptr = new Cryptr(process.env.CRYPTR_KEY);
        
        try {
            // Verificar firma JWT con clave pública RSA
            const decoded: any = jwt.verify(token, this.publicKey);

            // Validar existencia de user_id en payload
            if (!decoded.user_id) {
                return res.status(JsonResponse.FORBIDDEN).json({
                    ok: false,
                    errors: [{ message: 'El token no contiene el parámetro general del usuario.' }]
                });
            }

            // Desencriptar user_id y anexar a petición como número
            const user_id = cryptr.decrypt(decoded.user_id);
            (req as AuthenticatedRequest).userId = +user_id;

            // Continuar al siguiente middleware
            next();
        } catch (e: any) {
            // Manejo seguro de errores sin exponer detalles internos
            return res.status(JsonResponse.FORBIDDEN).json({
                ok: false,
                errors: [{ message: 'Token inválido o expirado.' }]
            });
        }
    }
}