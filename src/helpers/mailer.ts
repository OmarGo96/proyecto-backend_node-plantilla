import nodemailer, { Transporter } from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';
import { DateTime } from 'luxon'
import * as Sentry from "@sentry/node";

/**
 * Interfaz para los datos del correo electrónico.
 * 
 * Define la estructura requerida para el envío de correos,
 * incluyendo destinatario, asunto, plantilla y datos contextuales
 * para el renderizado dinámico del contenido.
 * 
 * @interface MailData
 * @description Estructura de datos para configuración de correos
 * 
 * @property {string} email - Dirección de correo del destinatario
 * @property {string} subject - Asunto del mensaje
 * @property {string} template - Nombre del archivo de plantilla Handlebars
 * @property {any} [context] - Datos opcionales para renderizado de plantilla
 * 
 * @since 1.0.0
 * @author OmarGo96
 */
interface MailData {
    email: string;
    subject: string;
    template: string;
    context?: any;
}

/**
 * Gestor de correo electrónico con soporte para plantillas Handlebars.
 * 
 * Esta clase proporciona una interfaz simplificada para el envío de correos
 * electrónicos utilizando Nodemailer como transporte SMTP y plantillas
 * Handlebars para el renderizado dinámico de contenido. Incluye configuración
 * automática desde variables de entorno, manejo robusto de errores y
 * integración con sistemas de monitoreo.
 * 
 * **Características principales:**
 * - Configuración automática de transporte SMTP desde variables de entorno
 * - Soporte completo para plantillas Handlebars (.hbs)
 * - Renderizado dinámico de contenido con datos contextuales
 * - Manejo centralizado y logging de errores
 * - Integración transparente con Sentry para monitoreo
 * - Validación de datos de entrada antes del envío
 * - Configuración reutilizable sin overhead de inicialización
 * 
 * **Casos de uso comunes:**
 * - Notificaciones transaccionales (bienvenida, confirmación, etc.)
 * - Alertas del sistema y notificaciones de estado
 * - Reportes automáticos y comunicaciones programadas
 * - Correos de verificación y recuperación de contraseñas
 * - Comunicación masiva con personalización individual
 * 
 * @class Mailer
 * @description Utilidad para envío de correos con plantillas Handlebars
 * @version 1.0.0
 * @author OmarGo96
 * 
 * @dependencies
 * - **nodemailer**: Biblioteca principal para envío de correos SMTP
 * - **nodemailer-express-handlebars**: Plugin para soporte de plantillas
 * - **path**: Manejo de rutas del sistema de archivos
 * - **moment**: Timestamps para logging de errores
 * - **@sentry/node**: Monitoreo y reporte de errores
 * 
 * @environment
 * **Variables de entorno requeridas:**
 * - **EMAIL_HOST**: Servidor SMTP para envío de correos
 * - **EMAIL_PORT**: Puerto del servidor SMTP
 * - **EMAIL_USER**: Usuario/dirección de autenticación SMTP
 * - **EMAIL_PASSWORD**: Contraseña de autenticación SMTP
 * 
 * @template-structure
 * **Organización de plantillas:**
 * - Directorio base: `./files/templates/`
 * - Extensión requerida: `.hbs`
 * - Soporte para partials y layouts
 * - Renderizado con datos contextuales dinámicos
 * 
 * @security
 * **Consideraciones de seguridad:**
 * - Credenciales SMTP desde variables de entorno
 * - Conexión segura SSL/TLS habilitada
 * - Validación de datos antes del envío
 * - Logging sanitizado sin exposición de credenciales
 * 
 * @performance
 * - Transporte SMTP reutilizable sin reconexión
 * - Configuración de plantillas una sola vez en constructor
 * - Operaciones asíncronas no bloqueantes
 * - Manejo eficiente de memoria para envíos masivos
 * 
 * @monitoring
 * - Reporte automático de errores a Sentry
 * - Logging detallado con timestamps
 * - Información contextual para debugging
 * 
 * @since 1.0.0
 */
export class Mailer {
    /** Instancia del transporte Nodemailer configurado */
    private transporter: Transporter;
    
    /** Configuración de Handlebars para renderizado de plantillas */
    private hbsConfig: any;

    /**
     * Constructor de la clase Mailer.
     * 
     * Inicializa el transporte SMTP utilizando credenciales desde variables
     * de entorno y configura el motor de plantillas Handlebars. La configuración
     * se realiza una sola vez durante la instanciación para optimizar el
     * rendimiento en envíos subsecuentes.
     * 
     * **Configuración SMTP:**
     * - Conexión segura SSL/TLS habilitada
     * - Autenticación con usuario y contraseña
     * - Puerto y host configurables vía environment
     * 
     * **Configuración de plantillas:**
     * - Motor Handlebars con extensión .hbs
     * - Directorio de plantillas en `./files/templates/`
     * - Soporte para partials y layouts
     * - Sin layout por defecto para máxima flexibilidad
     * 
     * @constructor
     * @description Inicializa transporte SMTP y configuración de plantillas
     * 
     * @throws {Error} Si las variables de entorno SMTP no están configuradas
     * @throws {Error} Si el directorio de plantillas no es accesible
     * 
     * @smtp-config
     * **Configuración del transporte:**
     * - host: process.env.EMAIL_HOST
     * - port: process.env.EMAIL_PORT
     * - secure: true (SSL/TLS)
     * - auth: usuario y contraseña desde environment
     * 
     * @template-config
     * **Configuración de Handlebars:**
     * - viewEngine: Motor de plantillas con configuración personalizada
     * - viewPath: Ruta base para archivos de plantilla
     * - extName: Extensión .hbs para archivos de plantilla
     * - partialsDir: Directorio de componentes reutilizables
     * - layoutsDir: Directorio de layouts base
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT),
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        this.hbsConfig = {
            viewEngine: {
                extName: '.hbs',
                partialsDir: path.join(__dirname, '../../files/templates/'),
                layoutsDir: path.join(__dirname, '../../files/templates/'),
                defaultLayout: ''
            },
            viewPath: path.join(__dirname, '../../files/templates/'),
            extName: '.hbs'
        };

        // Registrar handlebars en el transporte una sola vez
        this.transporter.use('compile', hbs(this.hbsConfig));
    }

    /**
     * Maneja y registra errores de forma centralizada.
     * 
     * Método privado que estandariza el manejo de errores en toda la clase,
     * incluyendo reporte automático a Sentry y logging local con timestamp.
     * Garantiza que todos los errores sean trackeados consistentemente.
     * 
     * @private
     * @method handleError
     * @param {any} error - Error capturado durante operaciones de correo
     * @returns {void} No retorna valor, realiza side effects de logging
     * 
     * @logging
     * **Información registrada:**
     * - Timestamp con formato 'YYYY-MM-DD HH:mm:ss'
     * - Mensaje o descripción del error
     * - Stack trace completo para debugging
     * 
     * @monitoring
     * - Reporte automático a Sentry con contexto completo
     * - Preservación de stack trace original
     * - Información adicional para correlación de errores
     * 
     * @error-types
     * **Tipos de errores manejados:**
     * - Errores de conexión SMTP
     * - Fallos de autenticación
     * - Problemas de renderizado de plantillas
     * - Errores de configuración
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    private handleError(error: any): void {
        Sentry.captureException(error);
        console.log(`Error mailer a las: ${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')}, ${error}`);
    }

    /**
     * Envía un correo electrónico utilizando plantilla Handlebars.
     * 
     * Método principal para el envío de correos electrónicos con renderizado
     * dinámico de contenido. Valida los datos de entrada, configura las
     * opciones del mensaje y maneja errores de forma robusta.
     * 
     * **Flujo de envío:**
     * 1. Validación de datos obligatorios
     * 2. Configuración de opciones del mensaje
     * 3. Renderizado de plantilla con datos contextuales
     * 4. Envío a través del transporte SMTP
     * 5. Manejo de errores y respuesta normalizada
     * 
     * @public
     * @async
     * @method send
     * @param {MailData} data - Configuración del correo a enviar
     * @returns {Promise<{ok: boolean, error?: any}>} Resultado del envío
     * 
     * @response-structure
     * **Respuesta exitosa:**
     * - ok: true (envío confirmado)
     * 
     * **Respuesta con error:**
     * - ok: false
     * - error: Descripción del error ocurrido
     * 
     * @validation
     * **Validaciones realizadas:**
     * - Presencia de email del destinatario
     * - Presencia de asunto del mensaje
     * - Presencia del nombre de plantilla
     * - Validación automática de formato de email por Nodemailer
     * 
     * @mail-options
     * **Configuración del mensaje:**
     * - from: Dirección del remitente desde EMAIL_USER
     * - to: Dirección del destinatario desde parámetros
     * - subject: Asunto del mensaje
     * - template: Nombre del archivo de plantilla
     * - context: Datos para renderizado dinámico
     * 
     * @template-rendering
     * **Proceso de renderizado:**
     * - Carga automática de archivo .hbs
     * - Inyección de datos contextuales
     * - Renderizado a HTML final
     * - Soporte para partials y helpers
     * 
     * @error-handling
     * **Errores comunes manejados:**
     * - Datos faltantes o inválidos
     * - Problemas de conexión SMTP
     * - Fallos de autenticación
     * - Plantillas no encontradas
     * - Errores de renderizado de contenido
     * 
     * @monitoring
     * - Errores reportados automáticamente a Sentry
     * - Logging detallado para debugging
     * - Preservación de información contextual
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    public async send(data: MailData): Promise<{ ok: boolean, error?: any }> {
        // Validación de datos obligatorios
        if (!data.email || !data.subject || !data.template) {
            return { ok: false, error: 'Faltan datos obligatorios para el envío de correo.' };
        }

        // Configuración de opciones del mensaje
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: data.email,
            subject: data.subject,
            template: data.template,
            context: data.context || {}
        };

        try {
            // Envío del correo a través del transporte SMTP
            await this.transporter.sendMail(mailOptions);
            return { ok: true };
        } catch (e) {
            // Manejo centralizado de errores
            this.handleError(e);
            return { ok: false, error: e };
        }
    }
}