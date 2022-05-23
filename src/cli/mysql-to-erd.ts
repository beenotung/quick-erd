#!/usr/bin/env node

import { loadKnex } from '../db/knex'
import { scanMysqlTableSchema } from '../db/mysql-to-text'
import { printTables } from '../core/table'

async function main() {
  const knex = loadKnex('mysql')
  const tableList = await scanMysqlTableSchema(knex)
  printTables(tableList)
  await knex.destroy()
}

main()
