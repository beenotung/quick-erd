import { Field, parse } from '../core/ast'
import { sortTables } from './sort-tables'

export function textToSqlite(text: string) {
  const result = parse(text)
  const table_list = sortTables(result.table_list)

  let up = ''
  let down = ''

  table_list.forEach(table => {
    const field_list = table.field_list.slice()
    const fieldNames: Record<string, 1> = {}

    if (field_list.length === 0) {
      field_list.push({
        name: 'id',
        type: 'integer',
        is_primary_key: true,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      })
    }

    // const fields: Record<string, 1> = {}
    up += /* sql */ `
create table if not exists ${table.name} (`
    field_list.forEach((field, i) => {
      fieldNames[field.name] = 1

      const is_first = i === 0

      if (is_first) {
        up += `
  `
      } else {
        up += `
, `
      }

      up += toSqliteColumnSql(field)
    })

    if (!fieldNames.created_at && !fieldNames.updated_at) {
      up += /* sql */ `
, created_at text not null default CURRENT_TIMESTAMP
, updated_at text null`
    }

    up += /* sql */ `
);
`
    down =
      /* sql */ `
drop table if exists ${table.name};
` + down
  })

  up = up
    .replace(/\r\n\r\n/, '\r\n')
    .replace(/\n\n/g, '\n')
    .trim()
  down = down
    .replace(/\r\n\r\n/, '\r\n')
    .replace(/\n\n/g, '\n')
    .trim()

  return { up, down }
}

export function toSqliteColumnSql(field: Field): string {
  if (field.is_primary_key) {
    return `${field.name} integer primary key`
  }
  let type = field.type

  if (type.match(/^varchar/i) || type.match(/^string/i)) {
    type = 'text'
  }

  let enums = ''
  if (type.match(/^enum/i)) {
    enums = type.replace(/^enum/i, '')
    type = 'text'
  }

  let sql = `${field.name} ${type}`

  if (field.is_null) {
    sql += ` null`
  } else {
    sql += ` not null`
  }

  if (field.is_unique) {
    sql += ` unique`
  }

  if (field.default_value) {
    sql += ` default ${field.default_value}`
  }

  if (enums) {
    sql += ` check(${field.name} in ${enums})`
  }

  const ref = field.references
  if (ref) {
    sql += ` references ${ref.table}(${ref.field})`
  }

  return sql
}
