import { Field, Table } from './ast'
import { formatEnum } from './enum'
import { makeGuide } from './guide'

export function tableToString(table: Table): string {
  return `
${table.name}
${'-'.repeat(table.name.length)}
${table.field_list.map(fieldToString).join('\n')}
`
}

export function fieldToString(field: Field): string {
  let type = field.type
  if (type.match(/^enum/i)) {
    type = formatEnum(type)
  }
  let text = `${field.name} ${type}`
  if (field.is_unsigned) {
    text += ` unsigned`
  }
  if (field.is_null) {
    text += ' NULL'
  }
  if (field.is_unique) {
    text += ' unique'
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
  tables = skipTimestamps(tables)
  const text = tablesToText(tables)
  // eslint-disable-next-line no-console
  console.log(text)
}

const skip_tables = [
  'knex_migrations',
  'knex_migrations_lock',
  'sqlite_sequence',
]
const skip_fields = ['created_at', 'updated_at']

function skipTimestamps(tables: Table[]): Table[] {
  return tables
    .filter(table => !skip_tables.includes(table.name))
    .map(table => ({
      ...table,
      field_list: table.field_list.filter(
        field => !skip_fields.includes(field.name),
      ),
    }))
}
