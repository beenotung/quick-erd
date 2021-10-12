import { config } from 'dotenv'
import Knex from 'knex'

config()

const env = process.env

export const knex = Knex({
  client: 'pg',
  connection: {
    database: env.DB_NAME,
    host: env.DB_HOST,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
  },
})
