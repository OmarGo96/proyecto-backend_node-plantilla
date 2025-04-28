/** Librería encargada de realizar la conexión a la base de datos */
import { Sequelize } from 'sequelize'
import * as Sentry from "@sentry/node";
/** Exporta la constnte que contiene la conexión a la base de datos */
export const database = new Sequelize({
  host: (process.env.MODE == 'dev') ? process.env.DB_HOST_DEVELOPMENT : (process.env.MODE == 'testing') ? process.env.DB_HOST_TESTING : process.env.DB_HOST_PRODUCTION,
  database: (process.env.MODE == 'dev') ? process.env.DB_NAME_DEVELOPMENT : (process.env.MODE == 'testing') ? process.env.DB_NAME_TESTING : process.env.DB_NAME_PRODUCTION,
  username: (process.env.MODE == 'dev') ? process.env.DB_USER_DEVELOPMENT : (process.env.MODE == 'testing') ? process.env.DB_USER_TESTING : process.env.DB_USER_PRODUCTION,
  password: (process.env.MODE == 'dev') ? process.env.DB_PASS_DEVELOPMENT : (process.env.MODE == 'testing') ? process.env.DB_PASS_TESTING : process.env.DB_PASS_PRODUCTION,
  dialect: (process.env.MODE == 'dev') ? 'mysql' : 'mariadb',
  timezone: '-05:00',
  port: (process.env.MODE == 'dev') ? +process.env.DB_PORT_DEVELOPMENT : (process.env.MODE == 'testing') ? +process.env.DB_PORT_TESTING : +process.env.DB_PORT_PRODUCTION,
  logging: false, /** Cambia este valor si deseas ver las consultas que estas ejecutando  */
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 15000
  },
})

export class Database {

  public async connection() {
    try {
      await database.authenticate();
      return { ok: true, message: 'Connection to the database established correctly' }
    } catch (e) { 
      Sentry.captureException(e);
      return { ok: false, message: 'Could not connect to the database. Please check the following: ' + e }
    }
  }
}

/** Si se necesita abarcar sobre el tema, visita el siguiente link: https://sequelize.org/v5/ */
