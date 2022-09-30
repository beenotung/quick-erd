import { parse, Field, Table } from '../core/ast'
import { sortTables } from './sort-tables'

const type_alias: Record<string, string> = {
  blob: 'binary',
  int: 'integer',
}

const specific_types = ['real']

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
  } else {
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

    type = type_alias[type] || type

    if (specific_types.includes(type) || type.match(/^char\(\d+\)$/i)) {
      code += `.specificType('${field.name}', '${type}')`
    } else if (length) {
      code += `.${type}('${field.name}', ${length})`
    } else {
      code += `.${type}('${field.name}')`
    }

    if (field.is_unsigned || field.references) {
      code += `.unsigned()`
    }
  }

  return code
}

export function toKnexCreateColumnCode(field: Field): string {
  let code = `
      table`
  if (field.is_primary_key) {
    code += `.increments('${field.name}')`
    return code
  }

  code += toKnexCreateColumnTypeCode(field)

  if (field.is_null) {
    code += `.nullable()`
  } else {
    code += `.notNullable()`
  }

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
