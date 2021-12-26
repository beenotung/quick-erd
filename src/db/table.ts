import { Field, Table } from '../core/ast'

export function tableToString(table: Table): string {
  return `
${table.name}
${'-'.repeat(table.name.length)}
${table.field_list.map(fieldToString).join('\n')}
`
}

export function fieldToString(field: Field): string {
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

export function printTables(tables: Table[]) {
  const text = tables.map(tableToString).join('\n')
  // eslint-disable-next-line no-console
  console.log(text)
}
