import { knex } from '../db/knex'
import { scanPGTableSchema } from '../db/pg-to-text'
import { printTables } from '../core/table'

async function main() {
  const tableList = await scanPGTableSchema()
  printTables(tableList)
  await knex.destroy()
}

main()
