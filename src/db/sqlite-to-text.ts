import { existsSync } from 'fs'
import Knex from 'knex'
import { Field, Table } from '../client/ast'
import { DDLParser } from '@vuerd/sql-ddl-parser'
import { parseTable } from '../client/sqlite-parser'

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
  const tableList: Table[] = []
  const table_rows: Array<{ name: string; sql: string }> = await knex
    .select('name', 'sql')
    .from('sqlite_master')
    .where({ type: 'table' })
  table_rows.forEach(row => {
    // const result = DDLParser(row.sql)
    // console.log(row.sql)
    // console.dir(result, { depth: 20 })
    const table = parseTable(row.sql)
    console.log('table:', table)
  })
}

async function main() {
  await scanTableSchema()
  await knex.destroy()
}

main()
