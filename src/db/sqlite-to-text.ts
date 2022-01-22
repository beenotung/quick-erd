import { existsSync } from 'fs'
import DB from 'better-sqlite3'
import { Table } from '../core/ast'
import { parseCreateTable } from './sqlite-parser'

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

export function scanSqliteTableSchema() {
  const table_list: Table[] = []
  const table_rows: Array<{ name: string; sql: string }> = db
    .prepare(`select name, sql from sqlite_master where type = 'table'`)
    .all()
  table_rows.forEach(row => {
    const field_list = parseCreateTable(row.sql)
    if (!field_list) {
      throw new Error('Failed to parse table: ' + row.sql)
    }
    table_list.push({ name: row.name, field_list: field_list })
  })
  return table_list
}
