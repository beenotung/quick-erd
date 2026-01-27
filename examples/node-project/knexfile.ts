// Update with your config settings.

import { env } from './env'

module.exports = {
  sqlite: {
    client: 'better-sqlite3',
    useNullAsDefault: true,
    connection: {
      filename: './db.sqlite3',
    },
  },

  mysql: {
    client: 'mysql',
    connection: {
      database: env.DB_NAME,
      user: env.DB_USERNAME,
      password: env.DB_PASSWORD,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },

  mssql: {
    client: 'mssql',
    connection: {
      database: env.DB_NAME,
      user: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      server: env.DB_HOST,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
    debug: true,
  },

  pg: {
    client: 'postgresql',
    connection: {
      database: env.DB_NAME,
      user: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      host: env.DB_HOST,
      port: env.DB_PORT,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
}

switch (env.DB_CLIENT) {
  case 'sqlite':
    module.exports.development = module.exports.sqlite
    break
  case 'mysql':
    module.exports.development = module.exports.mysql
    break
  case 'mssql':
    module.exports.development = module.exports.mssql
    break
  case 'pg':
  case 'postgresql':
    module.exports.development = module.exports.pg
    break
  default:
    if (env.DB_CLIENT.includes('sqlite')) {
      module.exports.development = module.exports.sqlite
      break
    }
    throw new Error('Unknown DB_CLIENT: ' + env.DB_CLIENT)
}
