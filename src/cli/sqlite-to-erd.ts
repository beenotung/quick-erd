#!/usr/bin/env node
import { scanSqliteTableSchema } from '../db/sqlite-to-text'
import { printTables } from '../core/table'

function main() {
  const tables = scanSqliteTableSchema()
  printTables(tables)
}

main()
