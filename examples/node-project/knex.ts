import Knex from 'knex'

/* eslint-disable @typescript-eslint/no-var-requires */

export const knex = Knex(require('./knexfile').development)
