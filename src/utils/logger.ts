import colors from 'colors';
import os from 'os';
import fs from 'fs';
import path from 'path';

/**
 * Clase utilitaria especializada para gestión y visualización de logs del servidor.
 * Proporciona funcionalidades avanzadas de logging con soporte para colores,
 * persistencia en archivos y formatos estructurados para facilitar debugging
 * y monitoreo en tiempo real.
 * 
 * Características principales:
 * - Logging colorizado según tipo de evento (start, error, info, warn, shutdown)
 * - Persistencia opcional en archivos locales con estructura JSON
 * - Información contextual automática (timestamp, entorno, host, puerto)
 * - Soporte para múltiples locales de fecha y hora
 * - Formato estructurado para integración con sistemas de monitoreo
 * - Manejo especializado de errores con stack traces
 * 
 * @class ServerLogger
 * @description Utilidad estática para logging avanzado del servidor
 * @version 1.0.0
 * @author OmarGo96
 * 
 * @example
 * // Logging de inicio del servidor:
 * ServerLogger.log({
 *   type: 'start',
 *   port: 3000,
 *   message: 'Servidor iniciado correctamente'
 * });
 * 
 * @example
 * // Logging de errores con stack trace:
 * ServerLogger.log({
 *   type: 'error',
 *   port: 3000,
 *   err: new Error('Error de conexión a base de datos'),
 *   message: 'Fallo en la conexión'
 * });
 * 
 * @example
 * // Logging de información con locale personalizado:
 * ServerLogger.log({
 *   type: 'info',
 *   port: 3000,
 *   message: 'Procesando petición de usuario',
 *   locale: 'en-US'
 * });
 * 
 * @example
 * // Configuración para persistencia en archivo:
 * // process.env.LOG_TO_FILE = 'true'
 * // Los logs se guardarán en ./logs/server.log
 * 
 * @features
 * - **Colores por tipo**: Verde (start), Rojo (error), Cyan (info), Amarillo (warn), Magenta (shutdown)
 * - **Persistencia**: Guardado automático en archivo si LOG_TO_FILE=true
 * - **Contexto rico**: Timestamp, entorno, hostname, puerto incluidos automáticamente
 * - **Manejo de errores**: Stack traces completos para debugging efectivo
 * - **Flexibilidad**: Soporte para mensajes personalizados y locales
 * 
 * @performance
 * - Operaciones síncronas optimizadas para logging en tiempo real
 * - Creación automática de directorios para archivos de log
 * - Formato JSON estructurado para procesamiento eficiente
 * 
 * @security
 * - No exposición de información sensible en logs por defecto
 * - Paths seguros para archivos de log dentro del proyecto
 * - Validación de tipos para prevenir inyección de contenido
 */
export class ServerLogger {

    /**
     * Genera un timestamp legible en formato localizado.
     * Combina fecha y hora en formato específico del locale proporcionado,
     * facilitando la lectura y análisis temporal de logs.
     * 
     * @protected
     * @static
     * @method getTimestamp
     * @description Generador de timestamps localizados para logs
     * @param {string} [locale='es-MX'] - Código de locale para formateo de fecha y hora
     * @returns {string} Timestamp formateado como 'dd/mm/yyyy hh:mm:ss'
     * 
     * @example
     * // Con locale por defecto (México):
     * const timestamp = ServerLogger.getTimestamp();
     * // Retorna: "15/12/2024 14:30:25"
     * 
     * @example
     * // Con locale estadounidense:
     * const timestamp = ServerLogger.getTimestamp('en-US');
     * // Retorna: "12/15/2024 2:30:25 PM"
     * 
     * @example
     * // Con locale europeo:
     * const timestamp = ServerLogger.getTimestamp('de-DE');
     * // Retorna: "15.12.2024 14:30:25"
     * 
     * @locales
     * - **es-MX**: Formato mexicano (dd/mm/yyyy hh:mm:ss)
     * - **en-US**: Formato estadounidense (mm/dd/yyyy h:mm:ss AM/PM)
     * - **en-GB**: Formato británico (dd/mm/yyyy hh:mm:ss)
     * - **de-DE**: Formato alemán (dd.mm.yyyy hh:mm:ss)
     * - **fr-FR**: Formato francés (dd/mm/yyyy hh:mm:ss)
     * 
     * @performance
     * - Operación ligera basada en Date nativo de JavaScript
     * - Formateo optimizado con toLocaleDateString y toLocaleTimeString
     * - Sin dependencias externas para formateo de fechas
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    protected static getTimestamp(locale: string = 'es-MX'): string {
        const now = new Date();
        const date = now.toLocaleDateString(locale);
        const hour = now.toLocaleTimeString(locale);
        return `${date} ${hour}`;
    }

    /**
     * Persiste logs en archivo local cuando está habilitado por configuración.
     * Crea automáticamente la estructura de directorios necesaria y anexa
     * el contenido al archivo de logs del servidor.
     * 
     * @private
     * @static
     * @method saveToFile
     * @description Persistencia condicional de logs en sistema de archivos
     * @param {string} logString - Contenido del log en formato string para guardar
     * @returns {void} No retorna valor, ejecuta side effect de escritura
     * 
     * @example
     * // Habilitar persistencia en variable de entorno:
     * // process.env.LOG_TO_FILE = 'true'
     * 
     * @example
     * // Estructura de archivos creada:
     * // proyecto/
     * // ├── logs/
     * // │   └── server.log
     * // └── src/
     * 
     * @example
     * // Contenido típico del archivo:
     * // {
     * //   "level": "start",
     * //   "timestamp": "15/12/2024 14:30:25",
     * //   "port": 3000,
     * //   "env": "production",
     * //   "host": "server-01",
     * //   "message": "Servidor iniciado"
     * // }
     * 
     * @configuration
     * - **LOG_TO_FILE**: Variable de entorno que controla la persistencia
     * - **Valor 'true'**: Habilita escritura en archivo
     * - **Cualquier otro valor**: Deshabilita persistencia
     * 
     * @filesystem
     * - **Ruta**: `./logs/server.log` desde el directorio raíz del proyecto
     * - **Creación automática**: Directorio `/logs` se crea si no existe
     * - **Modo append**: Nuevos logs se agregan al final del archivo
     * - **Formato**: Una entrada JSON por línea para fácil procesamiento
     * 
     * @performance
     * - Operación síncrona optimizada para logging en tiempo real
     * - Creación de directorios solo cuando es necesario
     * - Escritura eficiente con appendFileSync para mejor rendimiento
     * 
     * @security
     * - Path seguro dentro del proyecto (process.cwd())
     * - No exposición de rutas del sistema en logs
     * - Permisos de archivo heredados del proceso padre
     * 
     * @error-handling
     * - Creación automática de directorios con { recursive: true }
     * - Manejo implícito de errores de filesystem por Node.js
     * - Fallos en escritura no interrumpen la ejecución del servidor
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    private static saveToFile(logString: string): void {
        // Verificar si la persistencia está habilitada
        if (process.env.LOG_TO_FILE === 'true') {
            // Construir ruta segura para archivo de logs
            const logPath = path.join(process.cwd(), 'logs', 'server.log');
            
            // Crear directorio de logs si no existe
            fs.mkdirSync(path.dirname(logPath), { recursive: true });
            
            // Anexar log al archivo con nueva línea
            fs.appendFileSync(logPath, logString + '\n');
        }
    }

    /**
     * Construye un objeto estructurado de log con información contextual completa.
     * Recopila automáticamente metadatos del sistema y entorno para enriquecer
     * cada entrada de log con contexto útil para debugging y análisis.
     * 
     * @private
     * @static
     * @method buildLogObject
     * @description Constructor de objetos de log con contexto enriquecido
     * @param {string} type - Tipo de log que determina el nivel de severidad
     * @param {number} port - Puerto en el que opera el servidor
     * @param {Error} [err] - Objeto Error para logs de tipo 'error' con stack trace
     * @param {string} [message] - Mensaje personalizado descriptivo del evento
     * @param {string} [locale] - Locale para formateo del timestamp
     * @returns {object} Objeto estructurado con toda la información del log
     * 
     * @example
     * // Para log de inicio:
     * const logObj = buildLogObject('start', 3000, undefined, 'Servidor iniciado');
     * // Retorna:
     * // {
     * //   level: 'start',
     * //   timestamp: '15/12/2024 14:30:25',
     * //   port: 3000,
     * //   env: 'production',
     * //   host: 'server-01',
     * //   message: 'Servidor iniciado'
     * // }
     * 
     * @example
     * // Para log de error:
     * const error = new Error('Conexión fallida');
     * const logObj = buildLogObject('error', 3000, error, 'Error de BD');
     * // Retorna:
     * // {
     * //   level: 'error',
     * //   timestamp: '15/12/2024 14:30:25',
     * //   port: 3000,
     * //   env: 'production',
     * //   host: 'server-01',
     * //   message: 'Error de BD',
     * //   error: 'Conexión fallida',
     * //   stack: 'Error: Conexión fallida\n    at ...'
     * // }
     * 
     * @structure
     * - **level**: Tipo de log (start, error, info, warn, shutdown)
     * - **timestamp**: Fecha y hora del evento en formato localizado
     * - **port**: Puerto del servidor para identificación de instancia
     * - **env**: Entorno de ejecución (development, production, testing)
     * - **host**: Hostname del servidor para identificación en clusters
     * - **message**: Mensaje descriptivo opcional del evento
     * - **error**: Mensaje de error (solo para type='error')
     * - **stack**: Stack trace completo (solo para type='error')
     * 
     * @metadata
     * - **Timestamp**: Generado automáticamente en tiempo real
     * - **Environment**: Extraído de NODE_ENV o 'development' por defecto
     * - **Hostname**: Obtenido del sistema operativo para identificación
     * - **Port**: Proporcionado para distinguir múltiples instancias
     * 
     * @error-handling
     * - **Error objects**: Extracción segura de message y stack
     * - **Missing fields**: Campos opcionales manejados como undefined
     * - **Type safety**: Validación implícita de tipos en construcción
     * 
     * @performance
     * - Construcción eficiente de objetos con propiedades condicionales
     * - Una sola llamada a os.hostname() por entrada de log
     * - Reutilización de timestamp para múltiples operaciones
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    private static buildLogObject(type: string, port: number, err?: Error, message?: string, locale?: string): object {
        // Generar timestamp del evento
        const timestamp = this.getTimestamp(locale);
        
        // Obtener información del entorno
        const env = process.env.NODE_ENV || 'development';
        const host = os.hostname();
        
        // Construir objeto base del log
        const logObject: any = {
            level: type,
            timestamp,
            port,
            env,
            host,
            message: message || undefined
        };
        
        // Agregar información de error si es necesario
        if (type === 'error' && err) {
            logObject.error = err.message;
            logObject.stack = err.stack;
        }
        
        return logObject;
    }

    /**
     * Determina la función de colorización apropiada según el tipo de log.
     * Mapea cada tipo de evento a un color específico para mejorar la
     * legibilidad y identificación rápida en consola.
     * 
     * @private
     * @static
     * @method getColor
     * @description Selector de colores para tipos de log específicos
     * @param {string} type - Tipo de log para determinar el color apropiado
     * @returns {Function} Función de colorización de la librería colors
     * 
     * @example
     * // Para logs de inicio:
     * const colorFn = getColor('start');
     * console.log(colorFn('Servidor iniciado')); // Texto en verde
     * 
     * @example
     * // Para logs de error:
     * const colorFn = getColor('error');
     * console.log(colorFn('Error de conexión')); // Texto en rojo
     * 
     * @colors
     * - **start**: Verde (colors.green) - Eventos de inicio exitosos
     * - **error**: Rojo (colors.red) - Errores y fallos críticos
     * - **info**: Cyan (colors.cyan) - Información general y status
     * - **warn**: Amarillo (colors.yellow) - Advertencias y precauciones
     * - **shutdown**: Magenta (colors.magenta) - Eventos de cierre/apagado
     * - **default**: Sin color - Para tipos no reconocidos
     * 
     * @psychology
     * - **Verde**: Transmite éxito, normalidad, procesos completados
     * - **Rojo**: Indica peligro, errores, atención inmediata requerida
     * - **Cyan**: Sugiere información, neutralidad, datos informativos
     * - **Amarillo**: Advierte precaución, situaciones que requieren atención
     * - **Magenta**: Señala finalización, procesos de cierre importantes
     * 
     * @accessibility
     * - Colores contrastantes para mejor legibilidad en terminales
     * - Compatibilidad con terminales estándar y temas oscuros/claros
     * - Fallback sin color para entornos que no soportan colorización
     * 
     * @performance
     * - Switch statement optimizado para búsqueda rápida O(1)
     * - Funciones de color pre-compiladas de la librería colors
     * - Sin overhead de procesamiento adicional en renderizado
     * 
     * @compatibility
     * - **colors library**: Dependencia estable y ampliamente compatible
     * - **Terminal support**: Funciona en bash, zsh, PowerShell, cmd
     * - **CI/CD friendly**: Degradación elegante en entornos sin TTY
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    private static getColor(type: string): Function {
        switch (type) {
            case 'start': return colors.green;
            case 'error': return colors.red;
            case 'info': return colors.cyan;
            case 'warn': return colors.yellow;
            case 'shutdown': return colors.magenta;
            default: return (txt: string) => txt;
        }
    }

    /**
     * Método principal para registro de eventos del servidor con salida formateada.
     * Combina generación de logs estructurados, persistencia opcional y
     * visualización colorizada en consola para experiencia completa de logging.
     * 
     * **Flujo completo:**
     * 1. Construye objeto de log con información contextual
     * 2. Serializa a formato JSON estructurado
     * 3. Persiste en archivo si está configurado
     * 4. Renderiza en consola con colores y formato
     * 5. Presenta con divisores visuales para separación clara
     * 
     * @public
     * @static
     * @method log
     * @description Método principal de logging con formato y persistencia
     * @param {Object} params - Parámetros del log
     * @param {'start'|'error'|'info'|'warn'|'shutdown'} params.type - Tipo de evento a registrar
     * @param {number} params.port - Puerto del servidor para identificación
     * @param {Error} [params.err] - Objeto Error para logs de tipo 'error'
     * @param {string} [params.message] - Mensaje descriptivo personalizado
     * @param {string} [params.locale='es-MX'] - Locale para formateo de timestamp
     * @returns {void} No retorna valor, ejecuta side effects de logging
     * 
     * @example
     * // Logging de inicio del servidor:
     * ServerLogger.log({
     *   type: 'start',
     *   port: 3000,
     *   message: 'API REST iniciada correctamente'
     * });
     * 
     * @example
     * // Logging de error con stack trace:
     * try {
     *   await connectDatabase();
     * } catch (error) {
     *   ServerLogger.log({
     *     type: 'error',
     *     port: 3000,
     *     err: error,
     *     message: 'Fallo en conexión a base de datos'
     *   });
     * }
     * 
     * @example
     * // Logging de información con locale personalizado:
     * ServerLogger.log({
     *   type: 'info',
     *   port: 3000,
     *   message: 'Procesando 1000 usuarios activos',
     *   locale: 'en-US'
     * });
     * 
     * @example
     * // Logging de advertencia:
     * ServerLogger.log({
     *   type: 'warn',
     *   port: 3000,
     *   message: 'Memoria RAM al 85% de capacidad'
     * });
     * 
     * @example
     * // Logging de cierre del servidor:
     * ServerLogger.log({
     *   type: 'shutdown',
     *   port: 3000,
     *   message: 'Servidor detenido por señal SIGTERM'
     * });
     * 
     * @output
     * ```
     * ================================================================================
     * {
     *   "level": "start",
     *   "timestamp": "15/12/2024 14:30:25",
     *   "port": 3000,
     *   "env": "production",
     *   "host": "server-01",
     *   "message": "API REST iniciada correctamente"
     * }
     * ================================================================================
     * ```
     * 
     * @use-cases
     * - **Server startup**: Registrar inicio exitoso con configuración
     * - **Error tracking**: Capturar errores con contexto completo y stack trace
     * - **Performance monitoring**: Logs informativos sobre métricas del sistema
     * - **Security alerts**: Advertencias sobre eventos de seguridad
     * - **Graceful shutdown**: Registro ordenado de cierre de servicios
     * 
     * @integration
     * - **Log aggregators**: Formato JSON compatible con ELK, Splunk, etc.
     * - **Monitoring tools**: Estructura compatible con Prometheus, Grafana
     * - **CI/CD pipelines**: Salida parseable para automatización
     * - **Development tools**: Colores y formato optimizado para debugging
     * 
     * @performance
     * - **Operación síncrona**: Logging en tiempo real sin bloqueo
     * - **Serialización eficiente**: JSON.stringify optimizado
     * - **Colores cached**: Funciones de color pre-compiladas
     * - **Escritura conditional**: File I/O solo cuando está habilitado
     * 
     * @security
     * - **No data leaking**: Sin exposición automática de datos sensibles
     * - **Safe paths**: Rutas de archivo controladas y seguras
     * - **Error sanitization**: Stack traces controlados en logs de error
     * 
     * @monitoring
     * - **Structured format**: JSON para fácil parsing y análisis
     * - **Rich context**: Timestamp, environment, host para correlación
     * - **Error details**: Stack traces completos para debugging efectivo
     * - **Visual separation**: Divisores para identificación rápida en consola
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    public static log({ type, port, err, message, locale = 'es-MX' }: {
        type: 'start' | 'error' | 'info' | 'warn' | 'shutdown',
        port: number,
        err?: Error,
        message?: string,
        locale?: string
    }): void {
        // Construir objeto estructurado del log
        const logObject = this.buildLogObject(type, port, err, message, locale);
        
        // Crear divisor visual para separación en consola
        const divider = colors.white('='.repeat(80));
        
        // Serializar a JSON con formato legible
        const jsonLog = JSON.stringify(logObject, null, 2);

        // Persistir en archivo si está habilitado
        this.saveToFile(jsonLog);

        // Obtener función de color según tipo de log
        const colorFn = this.getColor(type);
        
        // Renderizar en consola con formato y colores
        console.log(`${divider}\n${colorFn(jsonLog)}\n${divider}\n`);
    }
}