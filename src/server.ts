import { createServer } from './config/app';
import process from 'process';
import * as Sentry from "@sentry/node";
import { ServerLogger } from './utils/logger';

/**
 * Módulo principal de arranque y gestión del servidor Express.
 * 
 * Este archivo actúa como punto de entrada principal de la aplicación, configurando
 * el servidor HTTP, estableciendo listeners para manejo robusto de errores y eventos
 * del sistema, e integrando herramientas de monitoreo y logging avanzado.
 * 
 * **Características principales:**
 * - Inicialización segura del servidor Express con configuración de puerto
 * - Manejo comprehensivo de errores y excepciones no manejadas
 * - Integración completa con Sentry para monitoreo de errores en producción
 * - Logging estructurado y colorizado con ServerLogger
 * - Gestión elegante de señales del sistema para apagado controlado
 * - Captura y reporte de advertencias del proceso Node.js
 * 
 * **Listeners configurados:**
 * - `uncaughtException`: Errores síncronos no manejados en el proceso
 * - `unhandledRejection`: Promesas rechazadas sin manejo de errores
 * - `server.error`: Errores específicos del servidor Express
 * - `process.warning`: Advertencias del runtime de Node.js
 * - `SIGINT/SIGTERM`: Señales de apagado del sistema operativo
 * - `process.exit`: Evento de finalización del proceso
 * 
 * **Flujo de inicialización:**
 * 1. Configuración de listeners de error globales
 * 2. Configuración de listeners de señales del sistema
 * 3. Inicio del servidor en el puerto especificado
 * 4. Logging de confirmación de inicialización exitosa
 * 
 * @module Server
 * @description Punto de entrada principal del servidor Express con manejo robusto de errores
 * @version 1.0.0
 * @author OmarGo96
 * 
 * @example
 * // Iniciar el servidor:
 * // npm start
 * // ó
 * // node dist/server.js
 * 
 * @example
 * // Variables de entorno requeridas:
 * // LISTEN_PORT=3000
 * // SENTRY_DSN=https://...
 * 
 * @example
 * // Salida típica de logs al iniciar:
 * // ================================================================================
 * // {
 * //   "level": "start",
 * //   "timestamp": "15/12/2024 14:30:25",
 * //   "port": 3000,
 * //   "env": "production",
 * //   "host": "server-01"
 * // }
 * // ================================================================================
 * 
 * @dependencies
 * - **Express Server**: Instancia configurada desde './config/app'
 * - **Sentry**: Monitoreo y reporte de errores
 * - **ServerLogger**: Logging estructurado y colorizado
 * - **Process**: API nativa de Node.js para gestión de procesos
 * 
 * @environment
 * - **LISTEN_PORT**: Puerto de escucha del servidor (requerido)
 * - **NODE_ENV**: Entorno de ejecución (development/production)
 * - **SENTRY_DSN**: URL de configuración de Sentry (recomendado)
 * 
 * @security
 * - Captura segura de errores sin exposición de información sensible
 * - Finalización controlada del proceso ante errores críticos
 * - Timeout de seguridad antes de process.exit para completar operaciones
 * 
 * @performance
 * - Inicio rápido con configuración optimizada
 * - Manejo eficiente de errores sin overhead en operación normal
 * - Logging asíncrono que no bloquea el hilo principal
 * 
 * @monitoring
 * - Integración completa con Sentry para tracking de errores
 * - Logs estructurados compatibles con sistemas de monitoreo
 * - Información contextual rica para debugging y análisis
 * 
 * @since 1.0.0
 */

/**
 * Puerto de escucha del servidor obtenido desde variables de entorno.
 * 
 * @constant {string|undefined} port
 * @description Puerto configurado para el servidor HTTP
 * @source process.env.LISTEN_PORT
 * 
 * @example
 * // Configuración típica:
 * // LISTEN_PORT=3000
 * 
 * @note
 * Si no está definido, el servidor fallará al intentar iniciar.
 * Considera usar un valor por defecto como 3000 para desarrollo.
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
const port = process.env.LISTEN_PORT

/**
 * Listener para manejo de excepciones no capturadas en el proceso Node.js.
 * 
 * Captura errores síncronos que no fueron manejados por ningún try/catch
 * en la aplicación, reportándolos a Sentry y finalizando el proceso de
 * manera controlada para evitar estados inconsistentes.
 * 
 * **Flujo de manejo:**
 * 1. Captura la excepción no manejada
 * 2. Reporta el error completo a Sentry
 * 3. Registra el evento en ServerLogger con contexto
 * 4. Finaliza el proceso después de 500ms de gracia
 * 
 * @function uncaughtExceptionHandler
 * @description Handler global para excepciones síncronas no manejadas
 * @param {Error} err - Objeto Error con información de la excepción
 * @returns {void} No retorna valor, finaliza el proceso
 * 
 * @example
 * // Tipos de errores que captura:
 * // - ReferenceError: variable no definida
 * // - TypeError: operación inválida en tipo
 * // - SyntaxError: código JavaScript inválido
 * // - RangeError: valor fuera de rango permitido
 * 
 * @example
 * // Log generado para excepción no manejada:
 * // {
 * //   "level": "error",
 * //   "timestamp": "15/12/2024 14:30:25",
 * //   "port": 3000,
 * //   "env": "production",
 * //   "host": "server-01",
 * //   "message": "Excepción no manejada en el proceso.",
 * //   "error": "ReferenceError: variable is not defined",
 * //   "stack": "ReferenceError: variable is not defined\n    at ..."
 * // }
 * 
 * @critical
 * **Comportamiento de finalización:**
 * - El proceso se termina con código de error 1
 * - Timeout de 500ms permite completar operaciones críticas
 * - Previene estados zombi o corrupción de datos
 * 
 * @monitoring
 * - Error reportado automáticamente a Sentry para análisis
 * - Stack trace completo disponible para debugging
 * - Contexto del servidor incluido en el reporte
 * 
 * @best-practices
 * - Usar try/catch en código síncrono crítico
 * - Validar inputs y estados antes de operaciones riesgosas
 * - Implementar handlers específicos para operaciones asíncronas
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
process.on('uncaughtException', (err) => {
    // Reportar error crítico a sistema de monitoreo
    Sentry.captureException(err);

    // Registrar evento con contexto completo para análisis
    ServerLogger.log({
        type: 'error',
        port: Number(port),
        err,
        message: 'Excepción no manejada en el proceso.'
    });

    // Finalizar proceso con timeout de gracia para operaciones críticas
    setTimeout(() => process.exit(1), 500);
});

/**
 * Listener para manejo de promesas rechazadas sin handler de error.
 * 
 * Captura promesas que fueron rechazadas pero no tuvieron un .catch()
 * o try/catch en async/await, evitando que el proceso continúe en
 * estado inconsistente y reportando el problema para corrección.
 * 
 * **Flujo de manejo:**
 * 1. Captura la promesa rechazada sin handler
 * 2. Reporta la razón del rechazo a Sentry
 * 3. Registra el evento con información descriptiva
 * 4. Finaliza el proceso para evitar corrupción de estado
 * 
 * @function unhandledRejectionHandler
 * @description Handler global para promesas rechazadas sin manejo
 * @param {any} reason - Razón del rechazo de la promesa (Error, string, etc.)
 * @returns {void} No retorna valor, finaliza el proceso
 * 
 * @example
 * // Tipos de rechazos que captura:
 * // - fetch() sin .catch()
 * // - async/await sin try/catch
 * // - Promise.reject() sin handler
 * // - Errores en callbacks de Promise
 * 
 * @example
 * // Código que activaría este handler:
 * // async function problematicFunction() {
 * //   await fetch('/api/endpoint'); // Sin try/catch
 * // }
 * // problematicFunction(); // Sin .catch()
 * 
 * @example
 * // Log generado para promesa rechazada:
 * // {
 * //   "level": "error",
 * //   "timestamp": "15/12/2024 14:30:25",
 * //   "port": 3000,
 * //   "env": "production",
 * //   "host": "server-01",
 * //   "message": "Promesa rechazada no manejada: Error: Connection failed"
 * // }
 * 
 * @critical
 * **Importancia del manejo:**
 * - Las promesas no manejadas pueden causar memory leaks
 * - Estados inconsistentes en la aplicación
 * - Pérdida de información crítica de errores
 * 
 * @monitoring
 * - Razón del rechazo reportada a Sentry automáticamente
 * - Información contextual del servidor incluida
 * - Timestamp preciso para correlación con otros eventos
 * 
 * @best-practices
 * - Usar try/catch en funciones async
 * - Agregar .catch() a todas las promesas
 * - Implementar error boundaries en operaciones críticas
 * - Validar respuestas de APIs externas
 * 
 * @debugging
 * - Revisar stack traces en Sentry para identificar origen
 * - Buscar patrones en logs para operaciones problemáticas
 * - Implementar logging adicional en funciones async críticas
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
process.on('unhandledRejection', (reason: any) => {
    // Reportar rechazo no manejado a sistema de monitoreo
    Sentry.captureException(reason);

    // Registrar evento con descripción clara del problema
    ServerLogger.log({
        type: 'error',
        port: Number(port),
        message: `Promesa rechazada no manejada: ${reason}`
    });

    // Finalizar proceso para evitar estado inconsistente
    setTimeout(() => process.exit(1), 500);
});

/**
 * Listener para advertencias del proceso Node.js.
 * 
 * Captura advertencias emitidas por Node.js sobre uso de APIs deprecadas,
 * configuraciones subóptimas, o potenciales problemas que no son errores
 * críticos pero requieren atención para mantener la aplicación saludable.
 * 
 * **Tipos de advertencias comunes:**
 * - DeprecationWarning: APIs o funciones obsoletas
 * - ExperimentalWarning: Uso de características experimentales
 * - MaxListenersExceededWarning: Demasiados listeners en EventEmitter
 * - UnhandledPromiseRejectionWarning: Promesas sin manejo (Node.js < 15)
 * 
 * @function processWarningHandler
 * @description Handler para advertencias del runtime de Node.js
 * @param {ProcessWarning} warning - Objeto warning con información del problema
 * @returns {void} No retorna valor, solo registra la advertencia
 * 
 * @example
 * // Advertencia típica de API deprecada:
 * // DeprecationWarning: crypto.createHash is deprecated. Use crypto.Hash instead.
 * 
 * @example
 * // Log generado para advertencia:
 * // {
 * //   "level": "warn",
 * //   "timestamp": "15/12/2024 14:30:25",
 * //   "port": 3000,
 * //   "env": "production",
 * //   "host": "server-01",
 * //   "message": "crypto.createHash is deprecated. Use crypto.Hash instead."
 * // }
 * 
 * @maintenance
 * **Importancia de las advertencias:**
 * - Indican código que debe actualizarse
 * - Previenen futuras incompatibilidades
 * - Ayudan a mantener la aplicación actualizada
 * - Pueden indicar problemas de rendimiento
 * 
 * @monitoring
 * - Advertencias visibles en logs para revisión regular
 * - Permiten monitoreo proactivo de salud del código
 * - Facilitan planificación de actualizaciones de dependencias
 * 
 * @best-practices
 * - Revisar advertencias regularmente durante desarrollo
 * - Actualizar código que usa APIs deprecadas
 * - Monitorear advertencias en producción para planificar mantenimiento
 * - Configurar alertas para tipos específicos de advertencias
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
process.on('warning', (warning) => {
    // Registrar advertencia para revisión y mantenimiento proactivo
    ServerLogger.log({
        type: 'warn',
        port: Number(port),
        message: warning.message
    });
});

/**
 * Listener para señal SIGINT (Ctrl+C) del sistema operativo.
 * 
 * Maneja la interrupción manual del proceso, típicamente cuando un usuario
 * presiona Ctrl+C en terminal. Permite un apagado elegante del servidor
 * registrando el evento antes de finalizar el proceso.
 * 
 * **Flujo de apagado:**
 * 1. Captura la señal SIGINT
 * 2. Registra el evento de apagado con razón específica
 * 3. Finaliza el proceso con código de salida 0 (éxito)
 * 
 * @function sigintHandler
 * @description Handler para señal de interrupción manual (Ctrl+C)
 * @returns {void} No retorna valor, finaliza el proceso
 * 
 * @example
 * // Activación típica:
 * // Usuario presiona Ctrl+C en terminal donde corre el servidor
 * 
 * @example
 * // Log generado al recibir SIGINT:
 * // {
 * //   "level": "shutdown",
 * //   "timestamp": "15/12/2024 14:35:10",
 * //   "port": 3000,
 * //   "env": "production",
 * //   "host": "server-01",
 * //   "message": "Servidor detenido por señal SIGINT (Ctrl+C)."
 * // }
 * 
 * @use-cases
 * - Desarrollo: Detener servidor durante testing
 * - Debugging: Parar servidor para análisis de logs
 * - Mantenimiento: Apagado manual para actualizaciones
 * - Emergency: Detener servidor ante comportamiento anómalo
 * 
 * @graceful-shutdown
 * - Registro del evento antes de finalizar
 * - Código de salida 0 indica terminación exitosa
 * - Permite cleanup automático del sistema operativo
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
process.on('SIGINT', () => {
    // Registrar apagado manual para auditoría
    ServerLogger.log({
        type: 'shutdown',
        port: Number(port),
        message: 'Servidor detenido por señal SIGINT (Ctrl+C).'
    });

    // Finalizar proceso exitosamente
    process.exit(0);
});

/**
 * Listener para señal SIGTERM del sistema operativo.
 * 
 * Maneja la terminación solicitada por el sistema, process managers
 * (como PM2, systemd), o herramientas de orquestación (como Kubernetes).
 * Es la señal estándar para solicitar apagado elegante de procesos.
 * 
 * **Fuentes comunes de SIGTERM:**
 * - Process managers (PM2, forever, systemd)
 * - Contenedores Docker al hacer stop
 * - Kubernetes durante rolling updates
 * - Herramientas de deployment automatizado
 * 
 * @function sigtermHandler
 * @description Handler para señal de terminación del sistema
 * @returns {void} No retorna valor, finaliza el proceso
 * 
 * @example
 * // Comando que envía SIGTERM:
 * // kill -TERM <process_id>
 * // docker stop <container>
 * // kubectl delete pod <pod_name>
 * 
 * @example
 * // Log generado al recibir SIGTERM:
 * // {
 * //   "level": "shutdown",
 * //   "timestamp": "15/12/2024 14:35:10",
 * //   "port": 3000,
 * //   "env": "production",
 * //   "host": "server-01",
 * //   "message": "Servidor detenido por señal SIGTERM."
 * // }
 * 
 * @deployment
 * **Importancia en producción:**
 * - Permite deployments sin pérdida de datos
 * - Facilita rolling updates en Kubernetes
 * - Esencial para zero-downtime deployments
 * - Requerido por muchos process managers
 * 
 * @best-practices
 * - Implementar cleanup de recursos antes de exit
 * - Cerrar conexiones de base de datos elegantemente
 * - Finalizar operaciones en curso antes de terminar
 * - Notificar a servicios dependientes del apagado
 * 
 * @monitoring
 * - Logs de SIGTERM ayudan a entender patrones de deployment
 * - Permiten detectar reinicios no planeados vs. programados
 * - Facilitan debugging de problemas de deployment
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
process.on('SIGTERM', () => {
    // Registrar terminación del sistema para auditoría
    ServerLogger.log({
        type: 'shutdown',
        port: Number(port),
        message: 'Servidor detenido por señal SIGTERM.'
    });

    // Finalizar proceso exitosamente
    process.exit(0);
});

/**
 * Listener para el evento de salida del proceso Node.js.
 * 
 * Se ejecuta justo antes de que el proceso termine, permitiendo
 * registrar el código de salida para auditoría y debugging.
 * Es el último evento que se puede capturar antes de la finalización.
 * 
 * **Códigos de salida comunes:**
 * - 0: Finalización exitosa
 * - 1: Error general o excepción no manejada
 * - 2: Uso incorrecto de comando
 * - 130: Terminado por SIGINT (Ctrl+C)
 * - 143: Terminado por SIGTERM
 * 
 * @function processExitHandler
 * @description Handler para evento de finalización del proceso
 * @param {number} code - Código de salida del proceso (0=éxito, >0=error)
 * @returns {void} No retorna valor, último evento antes de terminar
 * 
 * @example
 * // Log para salida exitosa:
 * // {
 * //   "level": "shutdown",
 * //   "timestamp": "15/12/2024 14:35:10",
 * //   "port": 3000,
 * //   "env": "production",
 * //   "host": "server-01",
 * //   "message": "El proceso finalizó con código 0."
 * // }
 * 
 * @example
 * // Log para salida con error:
 * // {
 * //   "level": "shutdown",
 * //   "timestamp": "15/12/2024 14:35:10",
 * //   "port": 3000,
 * //   "env": "production",
 * //   "host": "server-01",
 * //   "message": "El proceso finalizó con código 1."
 * // }
 * 
 * @debugging
 * **Utilidad del código de salida:**
 * - Código 0: Confirma terminación normal
 * - Código > 0: Indica tipo específico de error
 * - Correlación con logs anteriores para debugging
 * - Información valiosa para process monitors
 * 
 * @monitoring
 * - Permite tracking de estabilidad del servidor
 * - Facilita detección de crashes vs. apagados normales
 * - Información útil para alertas automatizadas
 * - Datos importantes para métricas de uptime
 * 
 * @limitations
 * **Limitaciones del evento exit:**
 * - Solo operaciones síncronas son permitidas
 * - No se pueden realizar operaciones async
 * - Timeout muy limitado para completar operaciones
 * - Debe ser usado solo para logging final
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
process.on('exit', (code) => {
    // Registrar código de salida para auditoría final
    ServerLogger.log({
        type: 'shutdown',
        port: Number(port),
        message: `El proceso finalizó con código ${code}.`
    });
});

/**
 * Función principal para inicialización del servidor Express.
 * 
 * Orquesta la inicialización completa del servidor incluyendo la creación
 * de la instancia de servidor, configuración de event listeners específicos
 * y arranque del servidor HTTP/HTTPS en el puerto configurado.
 * 
 * **Flujo de inicialización:**
 * 1. Crea el servidor usando la función factory asíncrona
 * 2. Configura el puerto desde variables de entorno con fallback
 * 3. Registra listener específico para errores del servidor
 * 4. Inicia el servidor en el puerto especificado
 * 5. Registra logs de confirmación de estado "ready"
 * 
 * @async
 * @function start
 * @description Función principal de inicialización y arranque del servidor
 * @returns {Promise<void>} No retorna valor, ejecuta side effects de inicialización
 * 
 * @example
 * // Ejecución automática al cargar el módulo:
 * // start(); // ← Se ejecuta al final del archivo
 * 
 * @example
 * // Logs generados al iniciar exitosamente:
 * // ================================================================================
 * // {
 * //   "level": "start",
 * //   "timestamp": "15/12/2024 14:30:25",
 * //   "port": 3000,
 * //   "env": "production",
 * //   "host": "server-01"
 * // }
 * // ================================================================================
 * // 
 * // ================================================================================
 * // {
 * //   "level": "info",
 * //   "timestamp": "15/12/2024 14:30:25",
 * //   "port": 3000,
 * //   "env": "production",
 * //   "host": "server-01",
 * //   "message": "El servidor está listo para recibir peticiones."
 * // }
 * // ================================================================================
 * 
 * @error-handling
 * **Manejo de errores específicos del servidor:**
 * - Errores de binding de puerto (EADDRINUSE, EACCES)
 * - Errores de configuración de red
 * - Problemas de certificados SSL/TLS
 * - Fallos de configuración del servidor
 * 
 * @startup-sequence
 * **Orden de eventos durante startup:**
 * 1. Creación asíncrona del servidor (await createServer())
 * 2. Configuración de puerto con fallback a 3000
 * 3. Registro de listener para errores del servidor
 * 4. Binding del puerto y inicio del listening
 * 5. Logs de confirmación de inicio exitoso
 * 6. Log informativo de estado "ready to receive requests"
 * 
 * @health-check
 * **Verificación de salud del servidor:**
 * - Log "start" confirma binding exitoso del puerto
 * - Log "info" confirma que server está accepting connections
 * - Timestamp permite medir tiempo de startup
 * - Port info facilita identificación en environments complejos
 * 
 * @monitoring
 * - Logs estructurados para fácil parsing en monitoring systems
 * - Información rica para dashboards de infraestructura
 * - Datos de startup útiles para alertas de availability
 * - Context completo para correlation con otros servicios
 * 
 * @performance
 * - Startup optimizado con mínimo overhead
 * - Logging no bloquea la inicialización del servidor
 * - Ready state claramente definido para load balancers
 * 
 * @configuration
 * **Variables de entorno utilizadas:**
 * - LISTEN_PORT: Puerto de escucha (fallback: 3000)
 * - NODE_ENV: Entorno de ejecución
 * - SENTRY_DSN: Configuración de monitoreo
 * 
 * @dependencies
 * - createServer(): Factory function para crear instancia del servidor
 * - Sentry: Sistema de monitoreo y reporte de errores
 * - ServerLogger: Utilidad para logging estructurado
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
async function start(): Promise<void> {
    // Crear instancia del servidor usando factory asíncrona
    const server = await createServer();
    
    // Configurar puerto con fallback para desarrollo
    const PORT = process.env.LISTEN_PORT || 3000;

    /**
     * Listener para errores específicos del servidor Express.
     * 
     * Maneja errores que ocurren a nivel del servidor HTTP, como
     * fallos en el binding del puerto, errores de red, o problemas
     * de configuración del servidor Express.
     * 
     * **Tipos de errores comunes:**
     * - EADDRINUSE: Puerto ya en uso por otro proceso
     * - EACCES: Permisos insuficientes para el puerto
     * - ENOTFOUND: Host no encontrado o configuración DNS incorrecta
     * - Errores de certificados SSL/TLS en modo HTTPS
     * 
     * @function serverErrorHandler
     * @description Handler especializado para errores del servidor Express
     * @param {Error} err - Objeto Error específico del servidor
     * @returns {void} No retorna valor, finaliza el proceso
     * 
     * @example
     * // Error común de puerto en uso:
     * // Error: listen EADDRINUSE: address already in use :::3000
     * 
     * @example
     * // Log generado para error de servidor:
     * // {
     * //   "level": "error",
     * //   "timestamp": "15/12/2024 14:30:25",
     * //   "port": 3000,
     * //   "env": "production",
     * //   "host": "server-01",
     * //   "error": "listen EADDRINUSE: address already in use :::3000",
     * //   "stack": "Error: listen EADDRINUSE...\n    at Server.setupListenHandle..."
     * // }
     * 
     * @troubleshooting
     * - **EADDRINUSE**: Cambiar puerto o terminar proceso que lo usa
     * - **EACCES**: Ejecutar con permisos adecuados o usar puerto > 1024
     * - **ENOTFOUND**: Verificar configuración de host/DNS
     * 
     * @monitoring
     * - Error completo reportado a Sentry con stack trace
     * - Información del puerto para identificar instancia problemática
     * - Contexto del servidor para debugging en clusters
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    server.on('error', (err: Error) => {
        // Reportar error de servidor a sistema de monitoreo
        Sentry.captureException(err);

        // Registrar error con contexto completo del servidor
        ServerLogger.log({ type: 'error', port: Number(PORT), err });

        // Finalizar proceso ante fallo crítico del servidor
        setTimeout(() => process.exit(1), 500);
    });

    // Iniciar servidor en puerto configurado con logging de confirmación
    server.listen(PORT, () => {
        // Registrar inicio exitoso del servidor
        ServerLogger.log({ type: 'start', port: Number(PORT) });
        
        // Confirmar disponibilidad para recibir tráfico
        ServerLogger.log({ 
            type: 'info', 
            port: Number(PORT), 
            message: 'El servidor está listo para recibir peticiones.' 
        });
    });
}

// Ejecutar inicialización del servidor
start();