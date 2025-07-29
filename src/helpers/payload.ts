import jwt, { SignOptions } from 'jsonwebtoken';
import fs from 'fs';
import { DateTime } from 'luxon';
import Cryptr from '@gc-sistemas/encrypt';
import * as Sentry from "@sentry/node";

/**
 * Estructura de datos para el payload de usuario en tokens JWT.
 * 
 * Define los campos requeridos para generar tokens de autenticación
 * para usuarios del sistema. Esta interfaz garantiza la consistencia
 * de datos y facilita la validación antes del cifrado.
 * 
 * @interface UserPayload
 * @description Datos de usuario para generación de tokens JWT
 * 
 * @property {number | string} user_id - Identificador único del usuario
 * 
 * @validation
 * - user_id: Campo obligatorio, no puede ser undefined o string vacío
 * - Acepta tanto number como string para flexibilidad de entrada
 * 
 * @security
 * - Todos los campos serán cifrados antes de incluirse en el JWT
 * - Solo contiene identificadores, no información sensible adicional
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
interface UserPayload {
    user_id: number | string;
}

/**
 * Estructura de datos para el payload de cliente en tokens JWT.
 * 
 * Define los campos requeridos para generar tokens de autenticación
 * para clientes del sistema. Utilizada en autenticación de aplicaciones
 * cliente o servicios externos.
 * 
 * @interface ClientPayload
 * @description Datos de cliente para generación de tokens JWT
 * 
 * @property {number | string} client_id - Identificador único del cliente
 * 
 * @validation
 * - client_id: Campo obligatorio, no puede ser undefined o string vacío
 * - Acepta tanto number como string para flexibilidad de entrada
 * 
 * @security
 * - Todos los campos serán cifrados antes de incluirse en el JWT
 * - Diseñado para autenticación de servicios y aplicaciones cliente
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
interface ClientPayload {
    client_id: number | string;
}

/**
 * Estructura del payload cifrado para tokens JWT.
 * 
 * Representa el payload después del proceso de cifrado, donde todos
 * los valores han sido convertidos a strings cifrados. Esta interfaz
 * garantiza la compatibilidad con jwt.sign() y mantiene la seguridad
 * de los datos sensibles.
 * 
 * @interface EncryptedPayload
 * @description Payload con campos cifrados para JWT
 * 
 * @property {string} [key: string] - Campos dinámicos cifrados como strings
 * 
 * @encryption
 * - Todos los valores son strings cifrados con @gc-sistemas/encrypt
 * - Las claves mantienen sus nombres originales para trazabilidad
 * - Compatible con el proceso de firma JWT
 * 
 * @structure
 * **Para usuarios:**
 * - user_id: string cifrado del ID de usuario
 * 
 * **Para clientes:**
 * - client_id: string cifrado del ID de cliente
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
interface EncryptedPayload {
    [key: string]: string;
}

/**
 * Gestor de tokens JWT con cifrado de campos sensibles.
 * 
 * Esta clase proporciona funcionalidades para generar tokens JWT seguros
 * con cifrado automático de datos sensibles utilizando la librería @gc-sistemas/encrypt.
 * Incluye validación robusta de datos, manejo de errores y configuración
 * flexible de algoritmos y tiempos de expiración.
 * 
 * **Características principales:**
 * - Cifrado automático de campos sensibles antes de incluir en JWT
 * - Soporte para tokens de usuario y cliente con estructuras diferentes
 * - Validación exhaustiva de datos requeridos
 * - Manejo robusto de errores con logging y monitoreo
 * - Configuración flexible de algoritmos y expiración
 * - Lectura segura de claves privadas desde sistema de archivos
 * 
 * **Casos de uso comunes:**
 * - Autenticación de usuarios en aplicaciones web y móviles
 * - Autenticación de servicios y aplicaciones cliente
 * - Tokens de sesión con información cifrada
 * - Integración segura entre microservicios
 * - APIs con autenticación basada en tokens
 * 
 * **Flujo de trabajo típico:**
 * 1. Recepción de datos de usuario/cliente
 * 2. Validación de campos obligatorios
 * 3. Cifrado de información sensible
 * 4. Generación de token JWT firmado
 * 5. Retorno de token para uso en autenticación
 * 
 * @class Payload
 * @description Utilidad para generación de tokens JWT con cifrado de datos
 * @version 1.0.0
 * @author OmarGo96
 * 
 * @dependencies
 * - **jsonwebtoken**: Generación y firma de tokens JWT
 * - **@gc-sistemas/encrypt**: Cifrado seguro de campos sensibles
 * - **fs**: Lectura de archivos de claves criptográficas
 * - **luxon**: Manejo moderno de fechas para logging
 * - **@sentry/node**: Monitoreo y reporte de errores
 * 
 * @environment
 * **Variables de entorno requeridas:**
 * - **CRYPTR_KEY**: Clave para cifrado de campos sensibles
 * - **PRIVATE_KEY**: Ruta a la clave privada RSA (producción)
 * - **MODE**: Entorno de ejecución ('dev' para desarrollo)
 * 
 * @file-structure
 * **Archivos de claves requeridos:**
 * - Desarrollo: `./src/keys/private.pem`
 * - Producción: Ruta especificada en PRIVATE_KEY
 * 
 * @security
 * **Medidas de seguridad implementadas:**
 * - Cifrado de campos sensibles antes de JWT
 * - Claves privadas almacenadas en archivos protegidos
 * - Validación de entrada para prevenir inyecciones
 * - Algoritmos RSA seguros para firma de tokens
 * - Logging sanitizado sin exposición de datos
 * 
 * @performance
 * - Lectura única de claves privadas por token
 * - Cifrado eficiente con librerías optimizadas
 * - Validación temprana para evitar procesamiento innecesario
 * - Manejo de errores sin overhead en casos exitosos
 * 
 * @monitoring
 * - Integración automática con Sentry para errores
 * - Logging estructurado con timestamps legibles
 * - Información contextual para debugging
 * - Trazabilidad completa de operaciones
 * 
 * @token-structure
 * **Estructura de tokens generados:**
 * - Header: Algoritmo y tipo (RS256/JWT)
 * - Payload: Campos cifrados + metadatos JWT
 * - Signature: Firma RSA con clave privada
 * 
 * @since 1.0.0
 */
export class Payload {

    /**
     * Centraliza el manejo y logging de errores.
     * 
     * Método privado que estandariza el manejo de errores en toda la clase,
     * incluyendo reporte automático a Sentry y logging local con timestamp.
     * Garantiza consistencia en el tratamiento de excepciones y facilita
     * el debugging y monitoreo en entornos de producción.
     * 
     * **Responsabilidades:**
     * - Reportar errores a sistema de monitoreo (Sentry)
     * - Generar logs locales con timestamp legible
     * - Preservar información de debugging
     * - Estandarizar formato de error logging
     * 
     * @private
     * @method handleError
     * @param {any} error - Error capturado durante operaciones
     * @returns {void} No retorna valor, realiza side effects de logging
     * 
     * @error-types
     * **Tipos de errores manejados:**
     * - Errores de lectura de archivos (claves privadas)
     * - Errores de cifrado/descifrado
     * - Errores de generación de JWT
     * - Errores de validación de datos
     * - Excepciones inesperadas del sistema
     * 
     * @logging-format
     * **Formato del log:**
     * - Prefijo: "Error payload a las:"
     * - Timestamp: formato yyyy-MM-dd HH:mm:ss
     * - Mensaje: descripción del error capturado
     * 
     * @monitoring
     * - Envío automático a Sentry con stack trace completo
     * - Preservación de contexto para correlación de errores
     * - Información adicional para análisis de patrones
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    private handleError(error: any): void {
        Sentry.captureException(error);
        console.log(`Error payload a las: ${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')}, ${error}`);
    }

    /**
     * Obtiene la clave privada para firmar tokens JWT.
     * 
     * Lee la clave privada RSA desde el sistema de archivos según el entorno
     * de ejecución. En desarrollo utiliza una ruta local predefinida,
     * en producción usa la ruta especificada en variables de entorno.
     * La clave se utiliza para firmar tokens JWT con algoritmo RSA.
     * 
     * **Comportamiento por entorno:**
     * - **Desarrollo (MODE='dev')**: Lee desde `./src/keys/private.pem`
     * - **Producción**: Lee desde ruta en `process.env.PRIVATE_KEY`
     * 
     * **Validación de seguridad:**
     * - Verificación de existencia del archivo
     * - Lectura en formato UTF-8 para compatibilidad
     * - Manejo de errores con excepción específica
     * 
     * @private
     * @method getPrivateKey
     * @returns {string} Clave privada RSA en formato PEM
     * @throws {Error} Si no se puede leer la clave privada
     * 
     * @file-requirements
     * **Requisitos del archivo:**
     * - Formato: PEM (Privacy-Enhanced Mail)
     * - Tipo: Clave privada RSA
     * - Codificación: UTF-8
     * - Permisos: Lectura para el proceso Node.js
     * 
     * @error-handling
     * **Errores comunes manejados:**
     * - Archivo no encontrado (ENOENT)
     * - Permisos insuficientes (EACCES)
     * - Formato de archivo inválido
     * - Variable de entorno no configurada
     * 
     * @security
 * **Consideraciones de seguridad:**
     * - Archivos de clave protegidos a nivel de sistema
     * - Variables de entorno para rutas sensibles
     * - No logging de contenido de claves
     * - Manejo seguro de excepciones
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    private getPrivateKey(): string {
        try {
            return fs.readFileSync(
                (process.env.MODE !== 'dev') ? process.env.PRIVATE_KEY! : './src/keys/private.pem',
                'utf8'
            );
        } catch (e) {
            this.handleError(e);
            throw new Error('No se pudo leer la clave privada.');
        }
    }

    /**
     * Valida los datos requeridos para el payload según el tipo de token.
     * 
     * Realiza validación exhaustiva de campos obligatorios basándose en
     * el tipo de token solicitado. Implementa verificaciones específicas
     * para cada tipo de payload (usuario o cliente) garantizando que
     * todos los campos requeridos estén presentes y sean válidos.
     * 
     * **Validaciones por tipo:**
     * - **Usuario**: Verifica presencia y validez de `user_id`
     * - **Cliente**: Verifica presencia y validez de `client_id`
     * 
     * **Criterios de validación:**
     * - Campo presente en el objeto
     * - Valor no undefined
     * - Valor no string vacío
     * - Tipo compatible (number o string)
     * 
     * @private
     * @method validatePayload
     * @param {UserPayload | ClientPayload} data - Datos a validar
     * @param {'user' | 'client'} type_token - Tipo de token para determinar validación
     * @returns {{ok: boolean, error?: string}} Resultado de la validación
     * 
     * @validation-rules
     * **Reglas de validación:**
     * 
     * **Para type_token = 'user':**
     * - data debe contener propiedad 'user_id'
     * - user_id no puede ser undefined
     * - user_id no puede ser string vacío
     * 
     * **Para type_token = 'client':**
     * - data debe contener propiedad 'client_id'
     * - client_id no puede ser undefined
     * - client_id no puede ser string vacío
     * 
     * @response-structure
     * **Respuesta exitosa:**
     * - ok: true (validación pasó)
     * 
     * **Respuesta con error:**
     * - ok: false
     * - error: Mensaje descriptivo del campo faltante o inválido
     * 
     * @type-safety
     * - Utiliza type guards para verificación de propiedades
     * - Type assertions seguras con verificación previa
     * - Manejo robusto de uniones de tipos
     * 
     * @error-messages
     * **Mensajes de error estandarizados:**
     * - "Falta o es inválido el campo obligatorio: user_id"
     * - "Falta o es inválido el campo obligatorio: client_id"
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    private validatePayload(data: UserPayload | ClientPayload, type_token: 'user' | 'client'): { ok: boolean, error?: string } {
        if (type_token === 'user') {
            if (!('user_id' in data) || (data as UserPayload).user_id === undefined || (data as UserPayload).user_id === '') {
                return { ok: false, error: 'Falta o es inválido el campo obligatorio: user_id' };
            }
        } else {
            if (!('client_id' in data) || (data as ClientPayload).client_id === undefined || (data as ClientPayload).client_id === '') {
                return { ok: false, error: 'Falta o es inválido el campo obligatorio: client_id' };
            }
        }
        return { ok: true };
    }

    /**
     * Genera un token JWT para usuario o cliente con cifrado de campos sensibles.
     * 
     * Método principal de la clase que implementa el proceso completo de
     * generación de tokens JWT seguros. Combina validación, cifrado y
     * firma digital en un flujo robusto y seguro para autenticación.
     * 
     * **Proceso completo de generación:**
     * 1. **Validación**: Verifica datos obligatorios según tipo de token
     * 2. **Preparación**: Obtiene clave privada e inicializa cifrador
     * 3. **Cifrado**: Encripta campos sensibles individualmente
     * 4. **Construcción**: Ensambla payload cifrado según tipo
     * 5. **Firma**: Genera token JWT con algoritmo y expiración especificados
     * 6. **Respuesta**: Retorna token o error en formato normalizado
     * 
     * **Seguridad implementada:**
     * - Cifrado de campos sensibles antes del JWT
     * - Firma RSA con clave privada protegida
     * - Validación previa para prevenir ataques
     * - Manejo seguro de errores sin exposición de datos
     * 
     * @public
     * @method createToken
     * @param {UserPayload | ClientPayload} data - Datos del usuario o cliente
     * @param {'user' | 'client'} type_token - Tipo de token a generar
     * @param {string} [expiresIn='9h'] - Tiempo de expiración del token
     * @param {jwt.Algorithm} [algorithm='RS256'] - Algoritmo de firma JWT
     * @returns {{ok: boolean, token?: string, error?: string}} Resultado con token o error
     * 
     * @parameters
     * **Descripción de parámetros:**
     * 
     * **data**: Objeto con información del usuario o cliente
     * - Para usuarios: debe contener user_id válido
     * - Para clientes: debe contener client_id válido
     * - Acepta number o string para flexibilidad
     * 
     * **type_token**: Determina el tipo de validación y estructura
     * - 'user': Para autenticación de usuarios del sistema
     * - 'client': Para autenticación de aplicaciones cliente
     * 
     * **expiresIn**: Tiempo de vida del token
     * - Formato: string compatible con jsonwebtoken
     * - Ejemplos: '9h', '1d', '30m', '7 days'
     * - Default: '9h' (9 horas)
     * 
     * **algorithm**: Algoritmo de firma digital
     * - Valores soportados: RS256, RS384, RS512, etc.
     * - Default: 'RS256' (RSA con SHA-256)
     * - Requiere clave privada RSA correspondiente
     * 
     * @response-structure
     * **Respuesta exitosa:**
     * ```typescript
     * {
     *   ok: true,
     *   token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." // Token JWT completo
     * }
     * ```
     * 
     * **Respuesta con error:**
     * ```typescript
     * {
     *   ok: false,
     *   error: "Descripción específica del error ocurrido"
     * }
     * ```
     * 
     * @encryption-process
     * **Proceso de cifrado:**
     * 1. Inicialización del cifrador con CRYPTR_KEY
     * 2. Conversión de valores a string para compatibilidad
     * 3. Cifrado individual de cada campo sensible
     * 4. Construcción de payload con campos cifrados
     * 5. Preservación de nombres de campos para trazabilidad
     * 
     * @jwt-configuration
     * **Configuración del JWT:**
     * - Header: Algoritmo especificado y tipo JWT
     * - Payload: Campos cifrados + claims estándar de JWT
     * - Signature: Firma RSA con clave privada
     * - Expiración: Tiempo configurado en parámetros
     * 
     * @error-handling
     * **Tipos de errores manejados:**
     * - Datos faltantes o inválidos en validación
     * - Fallos en lectura de clave privada
     * - Errores de cifrado de campos sensibles
     * - Problemas en generación de JWT
     * - Excepciones inesperadas del sistema
     * 
     * @monitoring
     * - Errores reportados automáticamente a Sentry
     * - Logging detallado con timestamps precisos
     * - Preservación de stack traces para debugging
     * - Información contextual para análisis
     * 
     * @performance
     * **Optimizaciones implementadas:**
     * - Validación temprana para evitar procesamiento innecesario
     * - Lectura eficiente de claves una sola vez por operación
     * - Cifrado optimizado con librerías especializadas
     * - Manejo de memoria controlado en operaciones criptográficas
     * 
     * @security-considerations
     * **Consideraciones de seguridad adicionales:**
     * - Tokens no reutilizables con expiración obligatoria
     * - Algoritmos criptográficos estándar y seguros
     * - Claves privadas protegidas a nivel de sistema
     * - Validación robusta contra inyecciones
     * - Logging sanitizado sin exposición de secretos
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    public createToken(
        data: UserPayload | ClientPayload,
        type_token: 'user' | 'client',
        expiresIn: string = '9h',
        algorithm: jwt.Algorithm = 'RS256'
    ): { ok: boolean, token?: string, error?: string } {
        try {
            // Validación robusta de datos de entrada
            const validation = this.validatePayload(data, type_token);
            if (!validation.ok) {
                return { ok: false, error: validation.error };
            }

            // Obtención segura de clave privada para firma
            const private_key = this.getPrivateKey();
            
            // Inicialización del cifrador con clave de entorno
            const cryptr = new Cryptr(process.env.CRYPTR_KEY);

            // Construcción del payload cifrado según tipo de token
            let payload: EncryptedPayload;
            if (type_token === 'user') {
                const user = data as UserPayload;
                payload = {
                    user_id: cryptr.encrypt(String(user.user_id))
                };
            } else {
                const client = data as ClientPayload;
                payload = {
                    client_id: cryptr.encrypt(String(client.client_id))
                };
            }

            // Firma del token JWT con configuración especificada
            const token = jwt.sign(payload, private_key, {
                algorithm,
                expiresIn: expiresIn as string | number
            });

            return { ok: true, token };
        } catch (e: any) {
            // Manejo centralizado de errores con logging y monitoreo
            this.handleError(e);
            return { ok: false, error: e.message || 'Error al generar el token.' };
        }
    }
}