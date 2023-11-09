import Knex from 'knex'

export let knex = Knex(require('./knexfile').development)
