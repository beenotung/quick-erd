import { parse } from '../core/ast'
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

      if (field.is_primary_key) {
        up += `${field.name} integer primary key`
        return
      }

      let type = field.type
      type = type.replace(/^varchar/, 'text')
      type = type.replace(/^string/, 'text')

      up += `${field.name} ${type}`

      if (field.is_null) {
        up += ` null`
      } else {
        up += ` not null`
      }

      const ref = field.references
      if (ref) {
        up += ` references ${ref.table}(${ref.field})`
      }
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
