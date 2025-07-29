import * as Sentry from "@sentry/node";
import { Response, Request, NextFunction } from 'express'

/**
 * Lista de headers sensibles que deben ser redactados por seguridad.
 * Estos headers contienen información de autenticación que no debe ser expuesta en logs.
 * 
 * @constant {string[]} SENSITIVE_HEADERS
 * @description Headers que se redactarán como '[REDACTED]' en los logs de Sentry
 * 
 * @example
 * // Headers que serán redactados:
 * // authorization: "Bearer abc123" → "[REDACTED]"
 * // cookie: "session=xyz789" → "[REDACTED]"
 * // x-api-key: "key123" → "[REDACTED]"
 */
const SENSITIVE_HEADERS = [
    'authorization',      // Token Bearer, Basic Auth, etc.
    'cookie',            // Cookies de sesión
    'x-api-key',         // API keys personalizadas
    'x-auth-token',      // Tokens de autenticación alternativos
    'x-access-token',    // Tokens de acceso JWT
    'proxy-authorization' // Autenticación de proxy
];

/**
 * Lista de campos del cuerpo de petición que contienen información sensible.
 * Estos campos serán redactados automáticamente en el body de las peticiones.
 * 
 * @constant {string[]} SENSITIVE_BODY_FIELDS
 * @description Campos del body que se redactarán como '[REDACTED]' en los logs
 * 
 * @example
 * // Campos que serán redactados:
 * // { password: "123456" } → { password: "[REDACTED]" }
 * // { userToken: "abc123" } → { userToken: "[REDACTED]" }
 * // { apiSecret: "xyz789" } → { apiSecret: "[REDACTED]" }
 */
const SENSITIVE_BODY_FIELDS = [
    'password',    // Contraseñas de usuario
    'token',       // Tokens de cualquier tipo
    'secret',      // Secretos y claves
    'key',         // Claves de API o encriptación
    'auth',        // Información de autenticación
    'credential'   // Credenciales de acceso
];

/**
 * Middleware especializado para el registro contextual de peticiones HTTP en Sentry.
 * Proporciona información detallada sobre cada request para facilitar el debugging
 * y monitoreo de errores en producción.
 * 
 * Características principales:
 * - Registro automático de información de peticiones HTTP
 * - Redacción de datos sensibles (tokens, cookies, API keys)
 * - Contexto enriquecido para debugging y análisis
 * - Integración transparente con Express middleware chain
 * - Captura de información del cliente (IP real, User-Agent)
 * - Trazabilidad completa de requests para troubleshooting
 * - Configuración flexible para entornos y captura de body
 * 
 * @class SentryLogs
 * @description Middleware estático para logging contextual con Sentry
 * @version 1.0.0
 * @author OmarGo96
 * 
 * @example
 * // Uso básico en aplicación:
 * import { SentryLogs } from './middlewares/scope_logs';
 * app.use(SentryLogs.scope);
 * 
 * @example
 * // Configuración para capturar body en desarrollo:
 * SentryLogs.configure({ captureBody: true });
 * app.use('/api', SentryLogs.scope);
 * 
 * @example
 * // Uso en rutas específicas:
 * router.get('/users', SentryLogs.scope, UserController.getUsers);
 * 
 * @security
 * - Headers de autorización automáticamente redactados
 * - Campos sensibles del body protegidos
 * - IP del cliente capturada para análisis de seguridad
 * - Solo headers esenciales incluidos en logs
 * 
 * @performance
 * - Operación ligera (~1-2ms overhead)
 * - Manejo de errores sin afectar la petición
 * - Captura opcional del body para reducir overhead
 */
export class SentryLogs {
    
    /** 
     * Configuración para capturar el cuerpo de las peticiones HTTP.
     * Por defecto está deshabilitado para optimizar performance.
     * 
     * @static
     * @type {boolean}
     * @default false
     * 
     * @example
     * // Habilitar captura de body:
     * SentryLogs.captureBody = true;
     * 
     * @example
     * // Usar configuración dinámica:
     * SentryLogs.configure({ captureBody: process.env.NODE_ENV === 'development' });
     */
    static captureBody = false;

    /**
     * Configura el comportamiento del middleware de logging.
     * Permite ajustar opciones como captura del body según el entorno.
     * 
     * @static
     * @public
     * @method configure
     * @description Configurador dinámico del middleware
     * @param {object} opts - Opciones de configuración
     * @param {boolean} [opts.captureBody] - Habilitar/deshabilitar captura del body
     * @returns {void} No retorna valor, modifica la configuración estática
     * 
     * @example
     * // Configurar para desarrollo (capturar body):
     * SentryLogs.configure({ captureBody: true });
     * 
     * @example
     * // Configurar para producción (sin body):
     * SentryLogs.configure({ captureBody: false });
     * 
     * @example
     * // Configuración condicional por entorno:
     * SentryLogs.configure({ 
     *   captureBody: process.env.NODE_ENV === 'development' 
     * });
     * 
     * @since 2.0.0
     */
    static configure(opts: { captureBody?: boolean } = {}): void {
        if (typeof opts.captureBody === 'boolean') {
            this.captureBody = opts.captureBody;
        }
    }

    /**
     * Middleware principal que enriquece el contexto de Sentry con información detallada de la petición HTTP.
     * Captura información relevante de cada request, redacta datos sensibles y establece contexto
     * para facilitar el debugging y análisis de errores en producción.
     * 
     * **Flujo de ejecución:**
     * 1. Establece tags de categorización en Sentry
     * 2. Captura contexto completo de la petición HTTP
     * 3. Redacta headers y body sensibles por seguridad
     * 4. Registra información del cliente (IP, User-Agent)
     * 5. Continúa al siguiente middleware
     * 
     * **Información capturada:**
     * - Tags: Tipo de entrada, método HTTP, entorno
     * - Contexto Request: URL, parámetros, query, headers sanitizados
     * - Body: Solo para métodos POST/PUT/PATCH si está habilitado
     * - Usuario: IP real del cliente y User-Agent
     * 
     * @static
     * @public
     * @method scope
     * @description Middleware de logging contextual para peticiones HTTP
     * @param {Request} req - Objeto Request de Express con información de la petición entrante
     * @param {Response} res - Objeto Response de Express (requerido por Express, no utilizado)
     * @param {NextFunction} next - Función callback para continuar al siguiente middleware
     * @returns {void} No retorna valor, ejecuta next() para continuar la cadena
     * 
     * @example
     * // Aplicar a todas las rutas:
     * app.use(SentryLogs.scope);
     * 
     * @example
     * // Aplicar solo a rutas API:
     * app.use('/api', SentryLogs.scope);
     * 
     * @example
     * // Información enviada a Sentry para GET /api/users?limit=10:
     * // Tags: { Type: "Request", "http.method": "GET", Environment: "production" }
     * // Context: {
     * //   Request: {
     * //     method: "GET",
     * //     url: "/api/users?limit=10",
     * //     params: {},
     * //     query: { limit: "10" },
     * //     headers: { referer: "https://app.com", authorization: "[REDACTED]" }
     * //   }
     * // }
     * // User: { ip_address: "192.168.1.100", user_agent: "Mozilla/5.0..." }
     * 
     * @security
     * - **Headers sensibles**: authorization, cookie, x-api-key automáticamente redactados
     * - **Body sensible**: password, token, secret redactados si captureBody está habilitado
     * - **IP tracking**: Solo para análisis de errores y geolocalización
     * - **Headers limitados**: Solo headers útiles para debugging incluidos
     * 
     * @performance
     * - **Overhead mínimo**: ~1-2ms por petición en condiciones normales
     * - **Error handling**: Fallos en logging no afectan la petición principal
     * - **Captura condicional**: Body solo capturado si está explícitamente habilitado
     * - **Async reporting**: Sentry envía datos de forma asíncrona
     * 
     * @debugging
     * - **Request correlation**: Correlaciona errores con peticiones específicas
     * - **User journey tracking**: Seguimiento de IPs para análisis de flujo
     * - **Environment tagging**: Filtra errores por entorno (dev/prod)
     * - **Method-based filtering**: Filtra por método HTTP en dashboard
     * 
     * @throws No lanza excepciones - todos los errores se capturan internamente
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    static scope(req: Request, res: Response, next: NextFunction): void {
        try {
            // Establecer tags para categorización y filtrado en Sentry dashboard
            Sentry.setTag("Type", "Request");
            Sentry.setTag("http.method", req.method);
            Sentry.setTag("Environment", process.env.NODE_ENV || 'unknown');

            // Capturar contexto completo de la petición HTTP con datos sanitizados
            Sentry.setContext("Request", {
                method: req.method,                                    // GET, POST, PUT, DELETE, etc.
                url: req.originalUrl,                                  // URL completa con query string
                params: req.params,                                    // Parámetros de ruta (/users/:id)
                query: req.query,                                      // Query parameters (?limit=10)
                headers: SentryLogs.sanitizeHeaders(req.headers),      // Headers sanitizados
                ...(SentryLogs.captureBody && ['POST', 'PUT', 'PATCH'].includes(req.method)
                    ? { body: SentryLogs.sanitizeBody(req.body) }      // Body sanitizado (opcional)
                    : {})
            });

            // Registrar información del cliente para análisis y troubleshooting
            Sentry.setUser({
                ip_address: SentryLogs.getClientIP(req),               // IP real considerando proxies
                user_agent: req.headers['user-agent'] || ''           // Browser/dispositivo del cliente
            });
        } catch (err) {
            // Capturar errores del middleware sin afectar la petición principal
            console.warn('SentryLogs error:', err);
        }
        
        // Continuar al siguiente middleware en la cadena de Express
        next();
    }

    /**
     * Sanitiza los headers de la petición redactando información sensible.
     * Solo incluye headers útiles para debugging y redacta tokens de autenticación.
     * 
     * @private
     * @static
     * @method sanitizeHeaders
     * @description Filtra y redacta headers sensibles de la petición
     * @param {Record<string, any>} headers - Headers originales de la petición HTTP
     * @returns {Record<string, any>} Headers sanitizados con información sensible redactada
     * 
     * @example
     * // Input:
     * // {
     * //   authorization: "Bearer abc123",
     * //   cookie: "session=xyz789", 
     * //   referer: "https://app.com",
     * //   "user-agent": "Mozilla/5.0..."
     * // }
     * 
     * // Output:
     * // {
     * //   authorization: "[REDACTED]",
     * //   referer: "https://app.com"
     * // }
     * 
     * @security
     * - Redacta automáticamente headers en SENSITIVE_HEADERS
     * - Solo incluye headers útiles para debugging (referer, content-type, etc.)
     * - Previene filtración de tokens y cookies en logs
     * 
     * @performance
     * - Operación O(n) donde n = número de headers
     * - Usa toLowerCase() para comparación insensible a mayúsculas
     * - Crea nuevo objeto sin modificar el original
     */
    private static sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
        const sanitized: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(headers)) {
            const lowerKey = key.toLowerCase();
            
            // Redactar headers sensibles
            if (SENSITIVE_HEADERS.includes(lowerKey)) {
                sanitized[key] = '[REDACTED]';
            } 
            // Incluir solo headers útiles para debugging
            else if (
                ['referer', 'content-type', 'content-length', 'origin', 'host', 'accept'].includes(lowerKey)
            ) {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    /**
     * Sanitiza el cuerpo de la petición redactando campos que contienen información sensible.
     * Redacta recursivamente campos anidados y maneja tanto objetos como arrays.
     * 
     * @private
     * @static
     * @method sanitizeBody
     * @description Redacta campos sensibles del body de la petición
     * @param {any} body - Cuerpo original de la petición HTTP
     * @returns {any} Cuerpo sanitizado con campos sensibles redactados o undefined si está vacío
     * 
     * @example
     * // Input:
     * // {
     * //   username: "john",
     * //   password: "secret123",
     * //   profile: {
     * //     name: "John Doe",
     * //     apiToken: "xyz789"
     * //   }
     * // }
     * 
     * // Output:
     * // {
     * //   username: "john",
     * //   password: "[REDACTED]",
     * //   profile: {
     * //     name: "John Doe", 
     * //     apiToken: "[REDACTED]"
     * //   }
     * // }
     * 
     * @security
     * - Redacta campos que contengan cualquier palabra de SENSITIVE_BODY_FIELDS
     * - Manejo recursivo de objetos anidados
     * - Preserva estructura original del objeto
     * - Redacta tanto claves exactas como claves que contengan palabras sensibles
     * 
     * @performance
     * - Recursión controlada para objetos anidados
     * - Preserva tipos de datos (arrays, objetos)
     * - Usa includes() para detección flexible de campos sensibles
     * - Retorna undefined para bodies vacíos (optimización)
     */
    private static sanitizeBody(body: any): any {
        // Retornar undefined para bodies vacíos o null
        if (!body) return undefined;
        
        // Retornar primitivos sin modificar
        if (typeof body !== 'object') return body;
        
        // Crear contenedor apropiado (array o objeto)
        const sanitized: any = Array.isArray(body) ? [] : {};
        
        // Procesar cada campo del body
        for (const [key, value] of Object.entries(body)) {
            const lowerKey = key.toLowerCase();
            
            // Redactar si la clave contiene alguna palabra sensible
            if (SENSITIVE_BODY_FIELDS.some(field => lowerKey.includes(field))) {
                sanitized[key] = '[REDACTED]';
            } 
            // Recursión para objetos anidados
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeBody(value);
            } 
            // Mantener valores primitivos
            else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    /**
     * Obtiene la dirección IP real del cliente considerando proxies, load balancers y CDNs.
     * Busca en orden de prioridad en headers estándar de proxy para obtener la IP original.
     * 
     * @private
     * @static
     * @method getClientIP
     * @description Extrae la IP real del cliente desde headers de proxy o conexión directa
     * @param {Request} req - Objeto Request de Express con información de la conexión
     * @returns {string} Dirección IP del cliente o string vacío si no se puede determinar
     * 
     * @example
     * // Con proxy (Cloudflare, AWS Load Balancer, etc.):
     * // x-forwarded-for: "203.0.113.1, 198.51.100.1"
     * // → Retorna: "203.0.113.1" (primera IP = cliente real)
     * 
     * @example
     * // Con proxy simple:
     * // x-real-ip: "203.0.113.1"
     * // → Retorna: "203.0.113.1"
     * 
     * @example
     * // Conexión directa:
     * // req.socket.remoteAddress: "203.0.113.1"
     * // → Retorna: "203.0.113.1"
     * 
     * @security
     * - Prioriza x-forwarded-for para detectar IP real tras proxies
     * - Solo toma la primera IP de la cadena (cliente original)
     * - Fallback a x-real-ip para proxies simples
     * - Fallback final a conexión directa del socket
     * 
     * @performance
     * - Evaluación perezosa con operadores || 
     * - Trim() solo si existe x-forwarded-for
     * - Sin regex, solo split() para mejor rendimiento
     * 
     * @returns {string} IP del cliente o string vacío si no disponible
     * 
     * @note
     * En entornos con múltiples proxies, x-forwarded-for contiene una cadena:
     * "IP_CLIENTE, IP_PROXY1, IP_PROXY2" - solo nos interesa la primera
     */
    private static getClientIP(req: Request): string {
        // Buscar en x-forwarded-for (estándar para proxies/load balancers)
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded && typeof forwarded === 'string') {
            // Tomar solo la primera IP (cliente original)
            return forwarded.split(',')[0].trim();
        }
        
        // Fallbacks en orden de prioridad
        return req.headers['x-real-ip'] as string ||          // Proxy simple (nginx, etc.)
               req.connection?.remoteAddress ||               // Conexión directa (legacy)
               req.socket?.remoteAddress ||                   // Conexión directa (actual)
               '';                                            // No disponible
    }
}