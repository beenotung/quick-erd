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

export type SSLType = 'required' | 'lax' | 'false'

export function loadKnex(client = env.DB_CLIENT || 'pg') {
  const database = env.DB_NAME || env.POSTGRES_DB
  const user = env.DB_USERNAME || env.DB_USER || env.POSTGRES_USER
  const password = env.DB_PASSWORD || env.DB_PASS || env.POSTGRES_PASSWORD
  const ssl = (env.DB_SSL || 'lax') as SSLType

  if (!database && !user) {
    console.error('Missing database credential in env.')
    // eslint-disable-next-line no-console
    console.log(`
Template for .env file:

DB_CLIENT=better-sqlite3|pg|mysql
DB_HOST=(optional)
DB_PORT=(optional)
DB_NAME=(or POSTGRES_DB)
DB_USERNAME=(or DB_USER or POSTGRES_USER)
DB_PASSWORD=(or DB_PASS or POSTGRES_PASSWORD)
DB_SSL=(optional, 'required' or 'lax' or 'false', default is 'lax')
`)
    process.exit(1)
  }

  const knex = Knex({
    client,
    connection: {
      database,
      host: env.DB_HOST,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      port: +env.DB_PORT! || undefined,
      user,
      password,
      multipleStatements: true,
      ssl:
        ssl == 'required'
          ? { rejectUnauthorized: true }
          : ssl == 'lax'
            ? { rejectUnauthorized: false }
            : false,
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
