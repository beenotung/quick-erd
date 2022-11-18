import Knex from 'knex'
import { env } from './env'

export function loadSqliteKnex(dbFile: string) {
  const knex = Knex({
    client: 'better-sqlite3',
    useNullAsDefault: true,
    connection: {
      filename: dbFile,
    },
  })
  return knex
}

export function loadKnex(client = env.DB_CLIENT || 'pg') {
  const database = env.DB_NAME
  const user = env.DB_USERNAME || env.DB_USER
  const password = env.DB_PASSWORD || env.DB_PASS

  if (!database && !user) {
    console.error('Missing database credential in env.')
    // eslint-disable-next-line no-console
    console.log(`
Template for .env file:

DB_CLIENT=better-sqlite3|pg|mysql
DB_HOST=
DB_NAME=
DB_USERNAME=
DB_PASSWORD=
`)
    process.exit(1)
  }

  const knex = Knex({
    client,
    connection: {
      database,
      host: env.DB_HOST,
      user,
      password,
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

  return knex
}
