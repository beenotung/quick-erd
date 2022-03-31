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

module.exports.development = module.exports.mysql
