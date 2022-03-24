import { Table } from '../core/ast'
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

type ColumnRow = {
  Field: string
  Type: string
  Null: string
  Key: string
}

export async function scanMysqlTableSchema() {
  const tableList: Table[] = []
  let table_result = await knex.raw(`show tables`)
  let table_name_field = table_result[1][0].name
  for (const table_row of table_result[0]) {
    const table: Table = {
      name: table_row[table_name_field],
      field_list: [],
    }
    if (table.name.startsWith('knex_migrations')) {
      continue
    }
    tableList.push(table)

    const column_result = await knex.raw(`desc \`${table.name}\``)
    for (const column_row of column_result[0] as ColumnRow[]) {
      const type = toDataType(column_row.Type)
      table.field_list.push({
        name: column_row.Field,
        type,
        is_primary_key: column_row.Key === 'PRI',
        is_null: column_row.Null === 'YES',
        references:
          column_row.Key === 'MUL'
            ? {
                type: '>-',
                table: 'todo',
                field: 'id',
              }
            : undefined,
      })
    }
  }
  return tableList
}
