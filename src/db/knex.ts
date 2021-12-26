import { config } from 'dotenv'
import Knex from 'knex'

config()

const env = process.env

const database = env.DB_NAME
const user = env.DB_USERNAME || env.DB_USER

if (!database && !user) {
  console.error('Missing database credential in env.')
  // eslint-disable-next-line no-console
  console.log(`
Template for .env file:

DB_NAME=
DB_HOST=
DB_USERNAME=
DB_PASSWORD=
`)
  process.exit(1)
}

export const knex = Knex({
  client: 'pg',
  connection: {
    database,
    host: env.DB_HOST,
    user,
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
