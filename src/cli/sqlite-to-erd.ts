#!/usr/bin/env node
import { scanSqliteTableSchema } from '../db/sqlite-to-text'
import { printTables } from '../core/table'
import { existsSync } from 'fs'
import DB from 'better-sqlite3'

const dbFile = process.argv[2]
if (!dbFile) {
  console.error('missing sqlite db filename in argument')
  process.exit(1)
}

if (!existsSync(dbFile)) {
  console.error('sqlite db file not found')
  process.exit(1)
}

const db = DB(dbFile, {
  readonly: true,
  fileMustExist: true,
})

function main() {
  const tables = scanSqliteTableSchema(db)
  printTables(tables)
}

main()
