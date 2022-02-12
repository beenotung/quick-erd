import { Field, Table } from '../core/ast'
import { makeGuide } from '../core/guide'

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

export function tablesToText(tables: Table[]) {
  const text =
    makeGuide('https://erd.surge.sh or https://quick-erd.surge.sh')
      .replace(' or ', '\n# or ')
      .trim() +
    '\n\n\n' +
    tables.map(tableToString).join('\n').trim()
  return text
}

export function printTables(tables: Table[]) {
  const text = tablesToText(tables)
  // eslint-disable-next-line no-console
  console.log(text)
}
