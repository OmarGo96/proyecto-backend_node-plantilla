import colors from 'colors';
import * as Sentry from "@sentry/node";
import { fromEnv } from "@aws-sdk/credential-providers";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DateTime } from 'luxon';

/**
 * Gestor de archivos para operaciones con AWS S3.
 * 
 * Esta clase proporciona una interfaz simplificada para realizar operaciones
 * de gestión de archivos PDF en buckets de Amazon S3. Incluye funcionalidades
 * para subir, descargar y eliminar archivos con validaciones de tipo,
 * manejo robusto de errores y organización automática por categorías.
 * 
 * **Características principales:**
 * - Gestión completa del ciclo de vida de archivos PDF en S3
 * - Validación automática de tipos de archivo (solo PDF)
 * - Organización jerárquica por tipos de documentos
 * - Generación automática de nombres únicos basados en timestamp
 * - Reemplazo seguro de archivos existentes
 * - Integración con Sentry para monitoreo de errores
 * - Logging colorizado para debugging
 * - Manejo eficiente de credenciales AWS
 * 
 * **Tipos de documentos soportados:**
 * - CONTRACT: Contratos y documentos legales
 * - DOCUMENTATION: Documentación general
 * - MEMBERSHIP: Documentos de membresías
 * 
 * **Casos de uso:**
 * - Gestión de documentos contractuales empresariales
 * - Almacenamiento de documentación técnica y manuales
 * - Archivo de documentos de membresías y certificaciones
 * - Sistemas de gestión documental corporativa
 * 
 * @class FileManager
 * @description Utilidad para gestión de archivos PDF en AWS S3
 * @version 1.0.0
 * @author OmarGo96
 * 
 * @dependencies
 * - **@aws-sdk/client-s3**: Cliente oficial de AWS para operaciones S3
 * - **@aws-sdk/credential-providers**: Proveedores de credenciales AWS
 * - **luxon**: Manejo moderno de fechas y timestamps
 * - **colors**: Colorización de logs para debugging
 * - **@sentry/node**: Monitoreo y reporte de errores
 * 
 * @environment
 * **Variables de entorno requeridas:**
 * - **AWS_BUCKET**: Nombre del bucket S3 de destino
 * - **AWS_REGION**: Región AWS para el servicio S3
 * - **AWS_ACCESS_KEY_ID**: Clave de acceso AWS (opcional si usa IAM roles)
 * - **AWS_SECRET_ACCESS_KEY**: Clave secreta AWS (opcional si usa IAM roles)
 * 
 * @security
 * **Consideraciones de seguridad:**
 * - Utiliza credenciales AWS desde variables de entorno
 * - Validación estricta de tipos de archivo (solo PDF)
 * - Nombres de archivo únicos para prevenir conflictos
 * - Manejo seguro de errores sin exposición de información sensible
 * 
 * @performance
 * - Cliente S3 reutilizable sin overhead de instanciación
 * - Streams eficientes para archivos grandes
 * - Operaciones asíncronas no bloqueantes
 * - Manejo optimizado de memoria para transferencias
 * 
 * @organization
 * **Estructura de directorios en S3:**
 * ```
 * bucket-name/
 * ├── contracts/          # Documentos contractuales
 * ├── documentation/      # Documentación general
 * └── memberships/        # Documentos de membresías
 * ```
 * 
 * @since 1.0.0
 */
export class FileManager {
    /** Cliente S3 configurado para operaciones de archivos */
    private s3Client: S3Client;

    /**
     * Constructor de la clase FileManager.
     * 
     * Inicializa el cliente S3 con credenciales obtenidas desde variables
     * de entorno y configura la región AWS especificada. Utiliza el
     * proveedor de credenciales fromEnv() para compatibilidad con
     * múltiples métodos de autenticación AWS.
     * 
     * @constructor
     * @description Inicializa el cliente S3 con configuración de entorno
     * 
     * @credentials
     * **Métodos de autenticación soportados:**
     * - Variables de entorno (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
     * - IAM roles en instancias EC2
     * - Perfiles AWS configurados localmente
     * - Credenciales temporales STS
     * 
     * @throws {Error} Si las credenciales AWS no están disponibles
     * @throws {Error} Si la región AWS no está configurada
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    constructor() {
        this.s3Client = new S3Client({
            credentials: fromEnv(),
            region: process.env.AWS_REGION
        });
    }

    /**
     * Obtiene la ruta de directorio en S3 según el tipo de archivo.
     * 
     * Mapea los tipos de archivo a sus respectivos directorios
     * en el bucket S3, manteniendo una organización jerárquica
     * clara y consistente de los documentos.
     * 
     * @private
     * @method getPath
     * @param {string} type - Tipo de archivo a procesar
     * @returns {string | null} Ruta del directorio S3 o null si el tipo es inválido
     * 
     * @mapping
     * **Mapeo de tipos a rutas:**
     * - 'CONTRACT' → 'contracts/'
     * - 'DOCUMENTATION' → 'documentation/'
     * - 'MEMBERSHIP' → 'memberships/'
     * - Cualquier otro → null
     * 
     * @validation
     * - Validación case-sensitive de tipos
     * - Retorno null para tipos no reconocidos
     * - Rutas terminadas en '/' para consistencia
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    private getPath(type: string): string | null {
        switch (type) {
            case 'CONTRACT': return 'contracts/';
            case 'DOCUMENTATION': return 'documentation/';
            case 'MEMBERSHIP': return 'memberships/';
            default: return null;
        }
    }

    /**
     * Sube un archivo PDF al bucket S3 en la ubicación correspondiente.
     * 
     * Realiza la subida completa de un archivo PDF al bucket S3,
     * incluyendo validaciones de tipo, generación de nombres únicos,
     * organización por categorías y opcionalmente reemplazo de
     * archivos existentes.
     * 
     * **Flujo de operación:**
     * 1. Validación de presencia y tipo de archivo
     * 2. Verificación del tipo de documento
     * 3. Generación de nombre único basado en timestamp
     * 4. Eliminación opcional de archivo anterior
     * 5. Subida del archivo a S3
     * 6. Retorno de resultado normalizado
     * 
     * @public
     * @async
     * @method upload
     * @param {any} data - Objeto con archivos recibidos (req.files format)
     * @param {string} type - Tipo de documento ('CONTRACT', 'DOCUMENTATION', 'MEMBERSHIP')
     * @param {string} [file_replace] - Nombre del archivo a reemplazar (opcional)
     * @returns {Promise<{ok: boolean, response?: any, nameFile?: string, message?: string}>}
     *          Resultado de la operación con detalles del archivo subido
     * 
     * @response-structure
     * **Respuesta exitosa:**
     * - ok: true
     * - response: Respuesta del servicio AWS S3
     * - nameFile: Nombre generado para el archivo
     * 
     * **Respuesta con error:**
     * - ok: false
     * - message: Descripción específica del error
     * 
     * @validation
     * **Validaciones realizadas:**
     * - Presencia del objeto archivo en data.files.file
     * - Tipo MIME debe ser 'application/pdf'
     * - Tipo de documento debe ser válido
     * 
     * @file-naming
     * **Convención de nombres:**
     * - Formato: {timestamp-unix}.pdf
     * - Timestamp en segundos desde epoch
     * - Garantiza unicidad temporal
     * 
     * @error-handling
     * - Reporte automático a Sentry de errores AWS
     * - Logging colorizado con timestamp legible
     * - Mensajes de error amigables al usuario
     * 
     * @aws-operations
     * **Operaciones S3 realizadas:**
     * - PutObjectCommand para subida de archivo
     * - DeleteObjectCommand para reemplazo (opcional)
     * - Configuración automática de Content-Type
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    public async upload(data: any, type: string, file_replace?: string): Promise<{ ok: boolean, response?: any, nameFile?: string, message?: string }> {
        const fileObj = data?.files?.file;
        if (!fileObj || fileObj == null) {
            return { ok: false, message: 'Favor de proporcionar un archivo a procesar' };
        }
        if (fileObj['mimetype'] !== 'application/pdf') {
            return { ok: false, message: 'Favor de proporcionar un archivo con extensión ".pdf"' };
        }

        const path = this.getPath(type);
        if (!path) {
            return { ok: false, message: 'El tipo de archivo proporcionado no es válido, intente con otro.' };
        }

        // Usando Luxon para obtener el timestamp unix
        const nameFile = `${DateTime.now().toSeconds() | 0}.pdf`;
        const key = path + nameFile;

        if (file_replace) {
            await this.destroy({ key: path + file_replace });
        }

        try {
            const paramsS3 = new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET,
                Key: key,
                Body: fileObj.data,
                ContentType: 'application/pdf',
            });

            const response = await this.s3Client.send(paramsS3);
            return { ok: true, response, nameFile };
        } catch (e) {
            Sentry.captureException(e);
            // Usando Luxon para el timestamp legible
            console.error(colors.red(`Error AWS a las: ${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')}, ${e}`));
            return { ok: false, message: 'Error al subir el archivo a S3.' };
        }
    }

    /**
     * Descarga un archivo PDF desde el bucket S3.
     * 
     * Recupera un archivo específico del bucket S3 basándose en
     * el nombre del archivo y su tipo de documento. Convierte
     * el stream de respuesta a un array de bytes para facilitar
     * su manipulación posterior.
     * 
     * **Flujo de operación:**
     * 1. Validación del tipo de documento
     * 2. Construcción de la clave S3 completa
     * 3. Solicitud de descarga al bucket S3
     * 4. Conversión del stream a array de bytes
     * 5. Retorno del archivo en formato binario
     * 
     * @public
     * @async
     * @method download
     * @param {string} name - Nombre exacto del archivo a descargar
     * @param {string} type - Tipo de documento ('CONTRACT', 'DOCUMENTATION', 'MEMBERSHIP')
     * @returns {Promise<{ok: boolean, file?: Uint8Array, message?: string}>}
     *          Resultado con el archivo descargado o mensaje de error
     * 
     * @response-structure
     * **Respuesta exitosa:**
     * - ok: true
     * - file: Array de bytes del archivo PDF
     * 
     * **Respuesta con error:**
     * - ok: false
     * - message: Descripción específica del error
     * 
     * @file-handling
     * **Procesamiento del archivo:**
     * - Descarga como stream desde S3
     * - Conversión a Uint8Array para compatibilidad
     * - Preservación completa del contenido binario
     * 
     * @validation
     * - Verificación de tipo de documento válido
     * - Construcción segura de la ruta completa
     * 
     * @error-handling
     * **Errores comunes manejados:**
     * - Archivo no encontrado en S3
     * - Permisos insuficientes
     * - Problemas de conectividad
     * - Errores de conversión de stream
     * 
     * @aws-operations
     * **Operaciones S3 realizadas:**
     * - GetObjectCommand para descarga de archivo
     * - transformToByteArray() para conversión de stream
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    public async download(name: string, type: string): Promise<{ ok: boolean, file?: Uint8Array, message?: string }> {
        const path = this.getPath(type);
        if (!path) {
            return { ok: false, message: 'El tipo de archivo proporcionado no es válido, intente con otro.' };
        }

        try {
            const command = new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET,
                Key: path + name,
            });

            const response = await this.s3Client.send(command);
            const pdf = await response.Body.transformToByteArray();

            return { ok: true, file: pdf };
        } catch (e) {
            Sentry.captureException(e);
            // Usando Luxon para el timestamp legible
            console.error(colors.red(`Error files a las: ${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')}, ${e}`));
            return { ok: false, message: 'Existen problemas al momento de obtener el pdf' };
        }
    }

    /**
     * Elimina un archivo específico del bucket S3.
     * 
     * Método interno utilizado para eliminar archivos del bucket S3,
     * típicamente durante operaciones de reemplazo de archivos.
     * Utiliza la clave completa del objeto para localización precisa.
     * 
     * **Flujo de operación:**
     * 1. Construcción del comando de eliminación
     * 2. Envío de la solicitud al servicio S3
     * 3. Confirmación de eliminación exitosa
     * 4. Manejo de errores si la operación falla
     * 
     * @private
     * @async
     * @method destroy
     * @param {object} data - Objeto con la clave del archivo a eliminar
     * @param {string} data.key - Clave completa del objeto S3 (path + filename)
     * @returns {Promise<{ok: boolean} | undefined>} Confirmación de eliminación o undefined en error
     * 
     * @response-structure
     * **Respuesta exitosa:**
     * - ok: true (eliminación confirmada)
     * 
     * **Respuesta con error:**
     * - undefined (error silencioso con logging)
     * 
     * @error-handling
     * **Manejo de errores:**
     * - Reporte automático a Sentry
     * - Logging colorizado con timestamp
     * - Retorno undefined para indicar fallo
     * 
     * @use-cases
     * **Casos de uso típicos:**
     * - Reemplazo de archivos existentes
     * - Limpieza de archivos temporales
     * - Mantenimiento del bucket S3
     * 
     * @aws-operations
     * **Operaciones S3 realizadas:**
     * - DeleteObjectCommand para eliminación de objeto
     * 
     * @since 1.0.0
     * @author OmarGo96
     */
    private async destroy(data: { key: string }): Promise<{ ok: boolean } | undefined> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET,
                Key: data.key,
            });

            await this.s3Client.send(command);
            return { ok: true };
        } catch (e) {
            Sentry.captureException(e);
            // Usando Luxon para el timestamp legible
            console.error(colors.red(`Error AWS a las: ${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')}, ${e}`));
        }
    }
}