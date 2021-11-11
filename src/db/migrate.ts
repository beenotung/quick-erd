import { knex } from './knex'
import { down, up } from '../../migrate'

down(knex)
  .then(() => up(knex))
  .catch(e => {
    console.error(e)
  })
  .finally(() => knex.destroy())
