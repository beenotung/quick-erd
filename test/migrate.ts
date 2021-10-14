import Knex from 'knex'
import { down, up } from '../migrate'

const knex = Knex({
  client: 'pg',
  connection: {
    database: 'erd',
    user: 'erd',
    password: 'erd',
  },
})

down(knex)
  .then(() => up(knex))
  .catch(e => {
    console.error(e)
  })
  .finally(() => knex.destroy())
