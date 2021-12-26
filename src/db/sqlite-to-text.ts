import { existsSync } from 'fs'
import Knex from 'knex'
import { Table } from '../core/ast'
import { parseCreateTable } from '../core/sqlite-parser'
import { printTables } from './table'

const dbFile = process.argv[2]
if (!dbFile) {
  console.error('missing sqlite db filename in argument')
  process.exit(1)
}
if (!existsSync(dbFile)) {
  console.error('sqlite db file not found')
  process.exit(1)
}

const knex = Knex({
  client: 'sqlite3',
  connection: { filename: dbFile },
  useNullAsDefault: true,
})

async function scanTableSchema() {
  const table_list: Table[] = []
  const table_rows: Array<{ name: string; sql: string }> = await knex
    .select('name', 'sql')
    .from('sqlite_master')
    .where({ type: 'table' })
  table_rows.forEach(row => {
    const field_list = parseCreateTable(row.sql)
    if (!field_list) {
      throw new Error('Failed to parse table: ' + row.sql)
    }
    table_list.push({ name: row.name, field_list: field_list })
  })
  return table_list
}

async function main() {
  const tables = await scanTableSchema()
  printTables(tables)
  await knex.destroy()
}

main()
