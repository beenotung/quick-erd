#!/usr/bin/env node

import { loadKnex } from '../db/knex'
import { scanMssqlTableSchema } from '../db/mssql-to-text'
import { printTables } from '../core/table'

async function main() {
  const knex = loadKnex('mysql')
  const tableList = await scanMssqlTableSchema(knex)
  printTables(tableList)
  await knex.destroy()
}

main()
