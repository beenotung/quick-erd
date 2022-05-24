// Update with your config settings.

import { env } from './env'

module.exports = {
  sqlite: {
    client: 'better-sqlite3',
    connection: {
      filename: './dev.sqlite3',
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

  pg: {
    client: 'postgresql',
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
}

switch (env.DB_CLIENT) {
  case 'sqlite':
    module.exports.development = module.exports.sqlite
    break
  case 'mysql':
    module.exports.development = module.exports.mysql
    break
  case 'pg':
  case 'postgresql':
    module.exports.development = module.exports.pg
    break
  default:
    throw new Error('Unknown DB_CLIENT:' + env.DB_CLIENT)
}
