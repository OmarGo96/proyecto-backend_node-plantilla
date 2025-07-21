import { Sequelize, Dialect } from 'sequelize';
import * as Sentry from "@sentry/node";

/**
 * Configuración y exportación de la instancia global de Sequelize según el entorno.
 * - Selecciona host, database, username, password, port y dialect según el entorno (desarrollo, testing, producción).
 * - Aplica zona horaria, pool de conexiones y desactiva logs de queries.
 */


// Validación de variables de entorno críticas para la base de datos
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

const mode = process.env.MODE;
const dialect: Dialect = mode === 'dev' ? 'mysql' : 'mariadb';
const config = {
  host: mode === 'dev' ? process.env.DB_HOST_DEVELOPMENT : mode === 'testing' ? process.env.DB_HOST_TESTING : process.env.DB_HOST_PRODUCTION,
  database: mode === 'dev' ? process.env.DB_NAME_DEVELOPMENT : mode === 'testing' ? process.env.DB_NAME_TESTING : process.env.DB_NAME_PRODUCTION,
  username: mode === 'dev' ? process.env.DB_USER_DEVELOPMENT : mode === 'testing' ? process.env.DB_USER_TESTING : process.env.DB_USER_PRODUCTION,
  password: mode === 'dev' ? process.env.DB_PASS_DEVELOPMENT : mode === 'testing' ? process.env.DB_PASS_TESTING : process.env.DB_PASS_PRODUCTION,
  dialect,
  timezone: '-05:00',
  port: mode === 'dev' ? Number(process.env.DB_PORT_DEVELOPMENT) : mode === 'testing' ? Number(process.env.DB_PORT_TESTING) : Number(process.env.DB_PORT_PRODUCTION),
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 15000
  },
};

export const database = new Sequelize(config);

/**
 * Clase para gestionar la conexión y autenticación con la base de datos.
 * Utiliza la instancia global de Sequelize y reporta errores a Sentry.
 */
export class Database {

  /**
   * Realiza la autenticación con la base de datos y retorna el estado de la conexión.
   * Si la conexión es exitosa, retorna un mensaje con el nombre y host de la base de datos.
   * Si falla, reporta el error a Sentry y retorna el mensaje de error.
   * @returns {Promise<{ok: boolean, message: string}>} Estado y mensaje de la conexión
   */
  public async connection(): Promise<{ok: boolean, message: string}> {
    try {
      await database.authenticate();
      return { ok: true, message: `Conexión exitosa a la base de datos '${config.database}' en el host '${config.host}'.` };
    } catch (e: any) {
      Sentry.captureException(e);
      return { ok: false, message: `No fue posible establecer la conexión a la base de datos por los siguientes motivos: . ${e?.message || e}` };
    }
  }
}
