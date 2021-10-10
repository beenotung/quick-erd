import { config } from 'dotenv'
import Knex from 'knex'
import { Table, Field } from '../client/ast'
config()

let env = process.env
let knex = Knex({
  client: 'pg',
  connection: {
    database: env.DB_NAME,
    host: env.DB_HOST,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
  },
})

function toDataType(type: string): string {
  if (type.includes('character varying')) {
    return 'string'
  }
  if (type.includes('timestamp')) {
    return 'timestamp'
  }
  return type
}

async function scanTableSchema() {
  let tableList: Table[] = []
  let table_rows = await knex
    .select('tablename')
    .from('pg_tables')
    .where({ schemaname: 'public' })
  for (let table_row of table_rows) {
    let table: Table = {
      name: table_row.tablename,
      field_list: [],
    }
    if (table.name.startsWith('knex_migrations')) {
      continue
    }
    tableList.push(table)
    let column_rows = await knex
      .select('column_name', 'data_type', 'is_nullable')
      .from('information_schema.columns')
      .where({ table_name: table.name })
    for (let column_row of column_rows) {
      table.field_list.push({
        name: column_row.column_name,
        type: toDataType(column_row.data_type),
        is_primary_key: false,
        is_null: column_row.is_nullable === 'YES',
        references: undefined,
      })
    }
  }
  return tableList
}

function tableToString(table: Table): string {
  return `
${table.name}
${'-'.repeat(table.name.length)}
${table.field_list.map(fieldToString).join('\n')}
`
}
function fieldToString(field: Field): string {
  let text = `${field.name} ${field.type}`
  if (field.is_null) {
    text += ' NULL'
  }
  if (field.is_primary_key) {
    text += ' PK'
  }
  if (field.references) {
    let ref = field.references
    text += ` ${ref.type} ${ref.table}.${ref.field}`
  }
  return text
}

async function main() {
  let tableList = await scanTableSchema()
  let text = tableList.map(tableToString).join('\n')
  console.log(text)
  // console.dir(tableList ,{depth:20})
  await knex.destroy()
}

main()
