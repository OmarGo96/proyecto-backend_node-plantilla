import { Router } from 'express';
import { ExampleController } from '../controllers/example.controller';
import { CheckHeaders } from '../middlewares/headers';

/**
 * Clase que encapsula y registra las rutas públicas para el controlador de ejemplos.
 * Proporciona endpoints de demostración para diferentes funcionalidades:
 * - Operaciones CRUD básicas (GET, POST, PUT, DELETE)
 * - Integración con AWS S3 (subida, descarga, eliminación)
 * - Manejo de archivos Excel (lectura y procesamiento)
 * - Encriptación/desencriptación de datos (RSA + AES)
 * 
 * @class ExampleRoutes
 * @description Todas las rutas son públicas y no requieren autenticación JWT
 * @version 1.0.0
 * @author OmarGo96
 */
export class ExampleRoutes {
    /** Router de Express para manejar las rutas */
    public router: Router;

    /** Instancia del controlador que maneja la lógica de negocio */
    private exampleController: ExampleController;

    /**
     * Inicializa el router y registra todas las rutas de ejemplo.
     * Cada ruta se mapea a un método específico del controlador.
     * 
     * @constructor
     * @description Configura automáticamente todas las rutas disponibles
     */
    constructor() {
        this.router = Router();
        this.exampleController = new ExampleController();

        // ========================================
        // RUTAS BÁSICAS DE DEMOSTRACIÓN
        // ========================================

        /** 
         * GET /example - Endpoint de prueba básico
         * @description Retorna un mensaje de bienvenida y estado del servidor
         * @returns {object} { ok: true, message: "Hello World!" }
         */
        this.router.get('/example', this.exampleController.example);

        /** 
         * GET /example - Endpoint de prueba básico
         * @description Retorna un mensaje de bienvenida y estado del servidor
         * @returns {object} { ok: true, message: "Hello World!" }
         */
        this.router.get('/example/users', this.exampleController.users);

        /** 
         * GET /example/users - Obtiene lista de usuarios de ejemplo
         * @description Retorna una lista simulada de usuarios para pruebas
         * @returns {object} { ok: true, users: Array<User> }
         */
        this.router.get('/', this.exampleController.users);

        // ========================================
        // RUTAS PARA OPERACIONES CON AWS S3
        // ========================================

        /** 
         * GET /example/aws/s3/upload - Sube un archivo a S3
         * @description Demuestra la subida de archivos al bucket configurado
         * @returns {object} { ok: true, url: string }
         */
        this.router.get('/example/aws/s3/upload', this.exampleController.awsS3Upload);

        /** 
         * GET /example/aws/s3/download - Descarga un archivo de S3
         * @description Obtiene un archivo desde el bucket S3 configurado
         * @returns {object} { ok: true, data: Buffer }
         */
        this.router.get('/example/aws/s3/download', this.exampleController.awsS3Download);

        // ========================================
        // RUTAS PARA MANEJO DE ARCHIVOS Y SEGURIDAD
        // ========================================

        /** 
         * GET /example/read-excel - Lee y procesa un archivo Excel
         * @description Demuestra la lectura de archivos .xlsx/.xls
         * @returns {object} { ok: true, data: Array<Object> }
         */
        this.router.get('/example/read-excel', this.exampleController.readExcel);

        /** 
         * GET /example/encrypt - Encripta datos de ejemplo
         * @description Muestra el proceso de encriptación RSA + AES
         * @returns {object} { ok: true, encryptedData: string }
         */
        this.router.get('/example/encrypt', this.exampleController.encrypt);

        /** 
         * GET /example/decrypt - Desencripta datos de ejemplo
         * @description Muestra el proceso de desencriptación RSA + AES
         * @returns {object} { ok: true, decryptedData: any }
         */
        this.router.get('/example/decrypt', this.exampleController.decrypt);
    }
}

/**
 * Exporta una instancia configurada del router de ejemplos
 * @description Router listo para ser usado en la aplicación principal
 */
export default new ExampleRoutes().router;