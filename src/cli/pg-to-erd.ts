#!/usr/bin/env node

import { loadKnex } from '../db/knex'
import { scanPGTableSchema } from '../db/pg-to-text'
import { printTables } from '../core/table'

async function main() {
  const knex = loadKnex('pg')
  const tableList = await scanPGTableSchema(knex)
  printTables(tableList)
  await knex.destroy()
}

main()
