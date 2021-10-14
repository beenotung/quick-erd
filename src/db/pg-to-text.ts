import { Table, Field } from '../client/ast'
import { knex } from './knex'

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
  const tableList: Table[] = []
  const table_rows = await knex
    .select('tablename')
    .from('pg_tables')
    .where({ schemaname: 'public' })
  for (const table_row of table_rows) {
    const table: Table = {
      name: table_row.tablename,
      field_list: [],
    }
    if (table.name.startsWith('knex_migrations')) {
      continue
    }
    tableList.push(table)
    const column_rows = await knex
      .select('column_name', 'data_type', 'is_nullable')
      .from('information_schema.columns')
      .where({ table_name: table.name })
    for (const column_row of column_rows) {
      const { rows } = await knex.raw(
        `
SELECT
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = ?
  AND kcu.column_name = ?
;
`,
        [table.name, column_row.column_name],
      )
      const fk_row = rows[0]
      table.field_list.push({
        name: column_row.column_name,
        type: toDataType(column_row.data_type),
        is_primary_key: false,
        is_null: column_row.is_nullable === 'YES',
        references: fk_row
          ? {
              type: '>-',
              table: fk_row.foreign_table_name,
              field: fk_row.foreign_column_name,
            }
          : undefined,
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
    const ref = field.references
    text += ` FK ${ref.type} ${ref.table}.${ref.field}`
  }
  return text
}

async function main() {
  const tableList = await scanTableSchema()
  const text = tableList.map(tableToString).join('\n')
  console.log(text)
  // console.dir(tableList ,{depth:20})
  await knex.destroy()
}

main()
