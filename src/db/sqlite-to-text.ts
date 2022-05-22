import { Table } from '../core/ast'
import { parseTableSchema } from './sqlite-parser'
import DB from 'better-sqlite3'
import { dbFile } from './sqlite'
import { existsSync } from 'fs'

if (!existsSync(dbFile)) {
  console.error('sqlite db file not found')
  process.exit(1)
}

const db = DB(dbFile, {
  readonly: true,
  fileMustExist: true,
})

export function scanSqliteTableSchema(): Table[] {
  const rows: Array<{ name: string; sql: string; type: string }> = db
    .prepare(/* sql */ `select name, sql, type from sqlite_master`)
    .all()
  const table_list = parseTableSchema(rows)
  return table_list
}
