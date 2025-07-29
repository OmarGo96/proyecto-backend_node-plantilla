import { Sequelize, Dialect } from 'sequelize'
import * as Sentry from "@sentry/node";

/**
 * Clase para gestionar la configuración y conexión con la base de datos usando Sequelize.
 * Proporciona una interfaz singleton para la conexión a la base de datos con soporte para
 * múltiples entornos (development, testing, production) y manejo robusto de errores.
 * 
 * Características principales:
 * - Validación automática de variables de entorno
 * - Configuración específica por entorno
 * - Pool de conexiones optimizado
 * - Manejo de errores con Sentry
 * - Soporte para MariaDB (development/testing/production)
 *
 * @class Database
 * @description Gestor singleton de conexión a base de datos con Sequelize
 * @version 1.0.0
 * @author OmarGo96
 * 
 * @example
 * // Uso básico:
 * const db = new Database();
 * const connection = await db.authenticate();
 * const sequelizeInstance = db.getInstance();
 * 
 * @example
 * // Variables de entorno requeridas:
 * // MODE=dev|testing|production
 * // DB_HOST_DEVELOPMENT, DB_NAME_DEVELOPMENT, etc.
 */
export class Database {
  /** Configuración de Sequelize específica del entorno actual */
  private config: any;
  
  /** Instancia principal de Sequelize para operaciones de base de datos */
  private sequelize: Sequelize;

  /**
   * Inicializa la clase Database con validación y configuración automática.
   * Ejecuta en orden:
   * 1. Validación de variables de entorno requeridas
   * 2. Generación de configuración específica del entorno
   * 3. Creación de instancia Sequelize con la configuración
   * 
   * @constructor
   * @description Constructor que auto-configura la conexión a base de datos
   * @throws {Error} Si faltan variables de entorno críticas para la conexión
   * 
   * @example
   * // Se ejecuta automáticamente:
   * const database = new Database();
   * // ✅ Validación de env vars
   * // ✅ Configuración del entorno
   * // ✅ Instancia Sequelize lista
   */
  constructor() {
    this.validateEnv();
    this.config = this.getConfig();
    this.sequelize = new Sequelize(this.config);
  }

  /**
   * Valida que todas las variables de entorno necesarias para la conexión estén presentes.
   * Verifica la existencia de variables para los tres entornos (development, testing, production)
   * y la variable MODE para determinar el entorno activo.
   * 
   * @private
   * @method validateEnv
   * @description Validación exhaustiva de variables de entorno de base de datos
   * @returns {void}
   * @throws {Error} Si falta alguna variable de entorno requerida
   * 
   * @example
   * // Variables requeridas por entorno:
   * // MODE
   * // DB_HOST_DEVELOPMENT, DB_NAME_DEVELOPMENT, DB_USER_DEVELOPMENT, etc.
   * // DB_HOST_TESTING, DB_NAME_TESTING, DB_USER_TESTING, etc.
   * // DB_HOST_PRODUCTION, DB_NAME_PRODUCTION, DB_USER_PRODUCTION, etc.
   */
  private validateEnv(): void {
    const requiredEnv = [
      'MODE',
      'DB_HOST_DEVELOPMENT', 'DB_NAME_DEVELOPMENT', 'DB_USER_DEVELOPMENT', 'DB_PASS_DEVELOPMENT', 'DB_PORT_DEVELOPMENT',
      'DB_HOST_TESTING', 'DB_NAME_TESTING', 'DB_USER_TESTING', 'DB_PASS_TESTING', 'DB_PORT_TESTING',
      'DB_HOST_PRODUCTION', 'DB_NAME_PRODUCTION', 'DB_USER_PRODUCTION', 'DB_PASS_PRODUCTION', 'DB_PORT_PRODUCTION'
    ];
    
    for (const key of requiredEnv) {
      if (typeof process.env[key] === 'undefined') {
        throw new Error(`Falta la variable de entorno: ${key}`);
      }
    }
  }

  /**
   * Obtiene la configuración de Sequelize según el entorno actual.
   * Selecciona automáticamente las variables de entorno correctas basándose en process.env.MODE
   * y configura opciones optimizadas para cada entorno.
   * 
   * @private
   * @method getConfig
   * @description Generador de configuración específica por entorno
   * @returns {object} Objeto de configuración compatible con Sequelize
   * 
   * @config
   * - **Dialect**:  MariaDB para development/testing/production
   * - **Timezone**: UTC-5 (Colombia/Bogotá)
   * - **Logging**: Deshabilitado para mejor rendimiento
   * - **Pool**: Máximo 5 conexiones, timeout 60s, idle 15s
   * 
   * @example
   * // Configuración generada para development:
   * // {
   * //   host: process.env.DB_HOST_DEVELOPMENT,
   * //   database: process.env.DB_NAME_DEVELOPMENT,
   * //   dialect: '',
   * //   pool: { max: 5, min: 0, acquire: 60000, idle: 15000 }
   * // }
   */
  private getConfig(): object {
    const mode = process.env.MODE;
    const dialect: Dialect = 'mariadb';
    
    return {
      host: mode === 'dev' ? process.env.DB_HOST_DEVELOPMENT : mode === 'testing' ? process.env.DB_HOST_TESTING : process.env.DB_HOST_PRODUCTION,
      database: mode === 'dev' ? process.env.DB_NAME_DEVELOPMENT : mode === 'testing' ? process.env.DB_NAME_TESTING : process.env.DB_NAME_PRODUCTION,
      username: mode === 'dev' ? process.env.DB_USER_DEVELOPMENT : mode === 'testing' ? process.env.DB_USER_TESTING : process.env.DB_USER_PRODUCTION,
      password: mode === 'dev' ? process.env.DB_PASS_DEVELOPMENT : mode === 'testing' ? process.env.DB_PASS_TESTING : process.env.DB_PASS_PRODUCTION,
      dialect,
      timezone: '-05:00', // UTC-5 para Colombia
      port: mode === 'dev' ? Number(process.env.DB_PORT_DEVELOPMENT) : mode === 'testing' ? Number(process.env.DB_PORT_TESTING) : Number(process.env.DB_PORT_PRODUCTION),
      logging: false, // Deshabilitar logs SQL para mejor rendimiento
      pool: {
        max: 5,        // Máximo de 5 conexiones concurrentes
        min: 0,        // Mínimo de 0 conexiones en idle
        acquire: 60000, // Timeout de 60 segundos para obtener conexión
        idle: 15000    // Tiempo máximo de 15 segundos en idle antes de cerrar
      },
    };
  }

  /**
   * Realiza la autenticación con la base de datos y retorna el estado de la conexión.
   * Ejecuta una prueba de conexión usando Sequelize.authenticate() y maneja tanto
   * casos exitosos como errores de conexión.
   * 
   * @public
   * @async
   * @method authenticate
   * @description Prueba y valida la conexión a la base de datos
   * @returns {Promise<{ok: boolean, message: string}>} Estado y mensaje descriptivo de la conexión
   * 
   * @example
   * // Conexión exitosa:
   * const result = await db.authenticate();
   * // { ok: true, message: "Conexión exitosa a la base de datos 'mi_db' en el host 'localhost'." }
   * 
   * @example
   * // Error de conexión:
   * const result = await db.authenticate();
   * // { ok: false, message: "No fue posible establecer la conexión a la base de datos por los siguientes motivos: Connection refused" }
   * 
   * @throws Los errores se capturan internamente y se reportan a Sentry
   */
  public async authenticate(): Promise<{ok: boolean, message: string}> {
    try {
      await this.sequelize.authenticate();
      return { 
        ok: true, 
        message: `Conexión exitosa a la base de datos '${this.config.database}' en el host '${this.config.host}'.` 
      };
    } catch (e: any) {
      Sentry.captureException(e);
      return { 
        ok: false, 
        message: `No fue posible establecer la conexión a la base de datos por los siguientes motivos: ${e?.message || e}` 
      };
    }
  }

  /**
   * Retorna la instancia Sequelize configurada para uso externo.
   * Permite acceder a todas las funcionalidades de Sequelize como modelos,
   * transacciones, migraciones y consultas personalizadas.
   * 
   * @public
   * @method getInstance
   * @description Proporciona acceso a la instancia Sequelize configurada
   * @returns {Sequelize} Instancia de Sequelize lista para usar
   * 
   * @example
   * // Obtener instancia para modelos:
   * const sequelize = db.getInstance();
   * const User = sequelize.define('User', { name: DataTypes.STRING });
   * 
   * @example
   * // Usar para transacciones:
   * const sequelize = db.getInstance();
   * const transaction = await sequelize.transaction();
   * // ... operaciones con transaction
   * await transaction.commit();
   */
  public getInstance(): Sequelize {
    return this.sequelize;
  }
}

/**
 * Instancia global de Sequelize para compatibilidad con modelos existentes.
 * Proporciona acceso directo a Sequelize sin necesidad de instanciar la clase Database.
 * 
 * @constant {Sequelize} database
 * @description Instancia singleton de Sequelize para uso en modelos
 * 
 * @example
 * // Importar en modelos:
 * import { database } from '../config/database';
 * const User = database.define('User', { ... });
 * 
 * @example
 * // Usar para consultas directas:
 * import { database } from '../config/database';
 * const users = await database.query('SELECT * FROM users');
 */
export const database = new Database().getInstance();