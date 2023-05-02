import { Table } from '../core/ast'
import { parseTableSchema } from './sqlite-parser'
import DB from 'better-sqlite3'

export function scanSqliteTableSchema(db: DB.Database): Table[] {
  const rows = db
    .prepare(/* sql */ `select name, sql, type from sqlite_master`)
    .all() as Array<{ name: string; sql: string; type: string }>
  const table_list = parseTableSchema(rows)
  return table_list
}
