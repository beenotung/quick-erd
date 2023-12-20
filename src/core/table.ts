import { Field, ParseResult, Table } from './ast'
import { formatEnum } from './enum'
import { makeGuide } from './guide'
import {
  diagramBgColorToLine,
  diagramTextColorToLine,
  tableBgColorToLine,
  tableNameToLine,
  tableTextColorToLine,
  textBgColorToLine,
  textColorToLine,
  viewToLine,
  zoomToLine,
} from './meta'

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

export function astToText(ast: ParseResult): string {
  let text = ''

  text += makeGuide(
    'https://erd.surge.sh or https://quick-erd.surge.sh',
  ).replace(' or ', '\n# or ')

  for (const table of ast.table_list) {
    text += '\n\n\n' + tableToString(table).trim()
  }

  text += '\n\n'

  if (ast.zoom) {
    text += '\n' + zoomToLine(ast.zoom)
  }
  if (ast.view) {
    text += '\n' + viewToLine(ast.view)
  }
  if (ast.textBgColor) {
    text += '\n' + textBgColorToLine(ast.textBgColor)
  }
  if (ast.textColor) {
    text += '\n' + textColorToLine(ast.textColor)
  }
  if (ast.diagramBgColor) {
    text += '\n' + diagramBgColorToLine(ast.diagramBgColor)
  }
  if (ast.diagramTextColor) {
    text += '\n' + diagramTextColorToLine(ast.diagramTextColor)
  }
  if (ast.tableBgColor) {
    text += '\n' + tableBgColorToLine(ast.tableBgColor)
  }
  if (ast.tableTextColor) {
    text += '\n' + tableTextColorToLine(ast.tableTextColor)
  }
  for (const table of ast.table_list) {
    if (table.position) {
      text += '\n' + tableNameToLine(table.name, table.position)
    }
  }

  return text.trim()
}

export function printTables(tables: Table[]) {
  tables = skipInternalFields(tables)
  const text = astToText({ table_list: tables })
  // eslint-disable-next-line no-console
  console.log(text)
}

export function isInternalTable(name: string): boolean {
  switch (name) {
    case 'knex_migrations':
    case 'knex_migrations_lock':
    case 'sqlite_sequence':
      return true
    default:
      return false
  }
}

const skip_fields = ['created_at', 'updated_at']

function skipInternalFields(tables: Table[]): Table[] {
  return tables
    .filter(table => !isInternalTable(table.name))
    .map(table => ({
      ...table,
      field_list: table.field_list.filter(
        field => !skip_fields.includes(field.name),
      ),
    }))
}
