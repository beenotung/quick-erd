import Knex from 'knex'
import { down, up } from '../migrate'
import { knex } from '../src/db/db'

down(knex)
  .then(() => up(knex))
  .catch(e => {
    console.error(e)
  })
  .finally(() => knex.destroy())
