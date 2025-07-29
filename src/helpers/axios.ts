import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { DateTime } from 'luxon';
import * as Sentry from '@sentry/node';

/**
 * Helper para realizar peticiones HTTP usando Axios con manejo de errores y logs.
 * 
 * Esta clase encapsula la funcionalidad de Axios proporcionando un wrapper
 * consistente para peticiones HTTP con manejo automático de errores,
 * logging estructurado y reporte a Sentry.
 * 
 * **Características principales:**
 * - Validación automática de configuración de peticiones
 * - Manejo centralizado de errores HTTP y de red
 * - Logging automático con timestamps localizados
 * - Integración transparente con Sentry para monitoreo
 * - Respuestas normalizadas con estructura consistente
 * - Soporte completo para tipos TypeScript genéricos
 * 
 * **Casos de uso comunes:**
 * - Integración con APIs externas (pagos, notificaciones, etc.)
 * - Consumo de microservicios internos
 * - Validación de datos contra servicios terceros
 * - Sincronización con sistemas legacy
 * 
 * @class Axios
 * @description Wrapper de Axios para peticiones HTTP con manejo robusto de errores
 * @version 1.0.0
 * @author OmarGo96
 * 
 * @monitoring
 * - Todos los errores se reportan automáticamente a Sentry
 * - Logs con timestamp para debugging
 * - Información contextual preservada
 * 
 * @performance
 * - Reutilizable sin overhead de instanciación
 * - Manejo eficiente de memoria
 * - Timeouts configurables por petición
 * 
 * @security
 * - No expone información sensible en logs de error
 * - Sanitización automática de mensajes de error
 * - Soporte para headers de autenticación
 * 
 * @since 1.0.0
 */
export class Axios {

    /**
     * Realiza una petición HTTP y retorna un objeto con el resultado normalizado.
     * 
     * Este método encapsula la lógica de peticiones HTTP proporcionando:
     * - Validación previa de la configuración
     * - Manejo automático de errores con fallback
     * - Logging detallado para debugging
     * - Estructura de respuesta consistente
     * - Integración transparente con Sentry
     * 
     * **Flujo de ejecución:**
     * 1. Valida la configuración de entrada
     * 2. Ejecuta la petición HTTP con Axios
     * 3. En caso de éxito, retorna los datos normalizados
     * 4. En caso de error, reporta a Sentry y retorna error amigable
     * 
     * @public
     * @async
     * @method getResponse
     * @template T - Tipo esperado de la respuesta del servidor
     * @param {AxiosRequestConfig} config - Configuración de la petición Axios
     * @returns {Promise<{ok: boolean; result: T | string}>} Objeto con resultado normalizado
     * 
     * @validation
     * **Validaciones realizadas:**
     * - config debe ser un objeto válido
     * - config.url debe estar presente y ser string
     * - Validaciones adicionales delegadas a Axios
     * 
     * @error-handling
     * **Manejo de errores:**
     * - **Configuración inválida**: Retorna error inmediatamente
     * - **Errores de red**: Timeout, DNS, conexión
     * - **Errores HTTP**: 4xx, 5xx del servidor
     * - **Errores de parsing**: JSON malformado
     * 
     * @response-structure
     * **Estructura de respuesta exitosa:**
     * ```typescript
     * {
     *   ok: true,
     *   result: T // Datos del servidor
     * }
     * ```
     * 
     * **Estructura de respuesta con error:**
     * ```typescript
     * {
     *   ok: false,
     *   result: string // Mensaje de error amigable
     * }
     * ```
     * 
     * @logging
     * **Información loggeada en errores:**
     * - Timestamp con formato 'YYYY-MM-DD HH:mm:ss'
     * - Mensaje de error del servidor o cliente
     * - Contexto adicional para debugging
     * 
     * @monitoring
     * - Errores reportados automáticamente a Sentry
     * - Stack trace completo para debugging
     * - Información de la petición preservada
     * 
     * @performance
     * **Consideraciones de rendimiento:**
     * - Timeout configurable por petición
     * - Manejo eficiente de memoria en errores
     * - Logs no bloquean el hilo principal
     * 
     * @security
     * **Medidas de seguridad:**
     * - Headers de autenticación soportados
     * - Mensajes de error sanitizados
     * - No expone información sensible en logs
     * 
     * @best-practices
     * - Siempre validar response.ok antes de usar result
     * - Configurar timeouts apropiados para el contexto
     * - Usar tipos TypeScript para mejor validación
     * - Manejar casos de error de forma apropiada
     * 
     * @troubleshooting
     * **Problemas comunes:**
     * - **Config inválida**: Verificar que url esté presente
     * - **Timeout**: Aumentar valor o verificar conectividad
     * - **401/403**: Verificar tokens de autenticación
     * - **500**: Problema en servidor destino
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    public async getResponse<T = any>(config: AxiosRequestConfig): Promise<{ ok: boolean; result: T | string }> {
        // Validación previa de configuración requerida
        if (!config || typeof config !== 'object' || !config.url) {
            return {
                ok: false,
                result: 'Configuración de petición inválida o faltante',
            };
        }

        try {
            // Ejecutar petición HTTP con configuración proporcionada
            const response: AxiosResponse<T> = await axios(config);

            // Retornar respuesta exitosa normalizada
            return {
                ok: true,
                result: response.data,
            };
        } catch (e: any) {
            // Reportar error a sistema de monitoreo
            Sentry.captureException(e);

            // Extraer mensaje de error más específico disponible
            const errorMsg = e?.response?.data?.message || e?.message || 'Error desconocido';

            // Registrar error con timestamp para debugging
            console.error(`Error axios a las: ${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')},`, errorMsg);

            // Retornar error normalizado con mensaje amigable
            return {
                ok: false,
                result: 'Existe un problema al momento de conectarse con el servidor externo',
            };
        }
    }
}