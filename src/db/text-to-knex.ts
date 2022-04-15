import { parse, Field } from '../core/ast'
import { sortTables } from './sort-tables'

export function textToKnex(text: string): string {
  const result = parse(text)

  let code = `
import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {`

  const table_list = sortTables(result.table_list)

  table_list.forEach((table, i) => {
    if (i > 0) code += `\n`
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
      if (field.is_primary_key) {
        code += `
      table.increments('${field.name}')`
        return
      }

      let type = field.type

      if (type.match(/^enum/i)) {
        const values = type
          .replace(/^enum/i, '')
          .replace(/^\(/, '[')
          .replace(/\)$/, ']')
          .replace(/','/g, "', '")

        code += `
      table.enum('${field.name}', ${values})`
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

        if (length) {
          code += `
      table.${type}('${field.name}', ${length})`
        } else {
          code += `
      table.${type}('${field.name}')`
        }

        if (field.is_unsigned || field.references) {
          code += `.unsigned()`
        }
      }

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
    })
    if (!fields.created_at && !fields.updated_at) {
      code += `
      table.timestamps(false, true)`
    }
    code += `
    })
  }`
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
