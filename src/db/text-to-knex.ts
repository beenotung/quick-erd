import { parse, Field, Table } from '../core/ast'
import { sortTables } from './sort-tables'

const type_alias: Record<string, string> = {
  bool: 'boolean',
  blob: 'binary',
  int: 'integer',
}

export function toKnexCreateColumnTypeCode(field: Field): string {
  let code = ''
  let type = field.type

  if (type.match(/^enum/i)) {
    const values = type
      .replace(/^enum/i, '')
      .replace(/^\(/, '[')
      .replace(/\)$/, ']')
      .replace(/','/g, "', '")

    code += `.enum('${field.name}', ${values})`
    return code
  }

  type = type.replace(/^varchar/i, 'string')

  let length = ''

  if (!length) {
    const match = type.match(/^string\((\d+)\)/i)
    if (match) {
      length = match[1]
      type = 'string'
    }
  }

  if (!length) {
    const match = type.match(/^int.*\((\d+)\)/i)
    if (match) {
      length = match[1]
      type = 'integer'
    }
  }

  if (type.match(/^decimal/i) || type.match(/^numeric/i)) {
    const match = type.match(/\(([\d\s,]+)\)/)
    if (match) {
      length = match[1]
        .split(',')
        .map(x => +x)
        .join(', ')
    }
    type = 'decimal'
  }

  type = type_alias[type.toLowerCase()] || type

  if (type && type[0] == type[0].toUpperCase()) {
    type = type.toLowerCase()
  }

  if (type.match(/^real$/i) || type.match(/^char\(\d+\)$/i)) {
    code += `.specificType('${field.name}', '${type}')`
  } else if (length) {
    code += `.${type}('${field.name}', ${length})`
  } else {
    code += `.${type}('${field.name}')`
  }

  if (field.is_unsigned || field.references) {
    code += `.unsigned()`
  }

  return code
}

export function toKnexDefaultValueCode(field: Field): string {
  return field.default_value ? `.defaultTo(${field.default_value})` : ''
}

export function toKnexNullableCode(field: Field): string {
  return field.is_null ? `.nullable()` : `.notNullable()`
}

export function toKnexCreateColumnCode(field: Field): string {
  let code = `
      table`
  if (field.is_primary_key) {
    code += `.increments('${field.name}')`
    return code
  }

  code += toKnexCreateColumnTypeCode(field)
  code += toKnexNullableCode(field)
  code += toKnexDefaultValueCode(field)

  if (field.is_unique) {
    code += `.unique()`
  }

  const ref = field.references
  if (ref) {
    code += `.references('${ref.table}.${ref.field}')`
  }
  return code
}

export function toKnexCreateTableCode(table: Table): string {
  let code = ''
  const fields: Record<string, Field> = {}
  table.field_list.forEach(field => (fields[field.name] = field))
  if (fields.created_at && fields.updated_at) {
    delete fields.created_at
    delete fields.updated_at
  }
  code += `
  if (!(await knex.schema.hasTable('${table.name}'))) {
    await knex.schema.createTable('${table.name}', table => {`
  Object.values(fields).forEach(field => {
    code += toKnexCreateColumnCode(field)
  })
  if (!fields.created_at && !fields.updated_at && !fields.timestamp) {
    code += `
      table.timestamps(false, true)`
  }
  code += `
    })
  }`
  return code
}

export function textToKnex(text: string): string {
  const result = parse(text)

  let code = `
import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {`

  const table_list = sortTables(result.table_list)

  table_list.forEach((table, i) => {
    if (i > 0) code += `\n`
    code += toKnexCreateTableCode(table)
  })

  code += `
}

export async function down(knex: Knex): Promise<void> {`

  table_list.reverse().forEach(table => {
    code += `
  await knex.schema.dropTableIfExists('${table.name}')`
  })

  code += `
}
`
  return code.trim()
}
