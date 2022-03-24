import { parse } from '../core/ast'
import { sortTables } from './sort-tables'

export function textToKnex(text: string): string {
  const result = parse(text)

  let code = `
import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
`

  const table_list = sortTables(result.table_list)

  table_list.forEach(table => {
    const fields: Record<string, 1> = {}
    code += `
  if (!(await knex.schema.hasTable('${table.name}'))) {
    await knex.schema.createTable('${table.name}', table => {`
    table.field_list.forEach(field => {
      fields[field.name] = 1
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

        code += `
      table.enum('${field.name}', ${values})`
      } else {
        type = type.replace(/^varchar/i, 'string')

        let length = ''
        if (type.match(/^string/i)) {
          length = type
            .replace(/^string/i, '')
            .replace(/^\(/, '')
            .replace(/\)$/, '')
          type = 'string'
        }

        if (length) {
          code += `
      table.${type}('${field.name}', ${length})`
        } else {
          code += `
      table.${type}('${field.name}')`
        }
      }

      if (field.is_null) {
        code += `.nullable()`
      } else {
        code += `.notNullable()`
      }

      const ref = field.references
      if (ref) {
        code += `.unsigned().references('${ref.table}.${ref.field}')`
      }
    })
    if (!fields.created_at && !fields.updated_at) {
      code += `
      table.timestamps(false, true)`
    }
    code += `
    })
  }
`
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
  return code
}
