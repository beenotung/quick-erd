#!/usr/bin/env node
process.env.DB_CLIENT = 'mysql'

import { knex } from '../db/knex'
import { scanMysqlTableSchema } from '../db/mysql-to-text'
import { printTables } from '../core/table'

async function main() {
  const tableList = await scanMysqlTableSchema()
  printTables(tableList)
  await knex.destroy()
}

main()
