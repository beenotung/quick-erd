import { Table, Field, parse } from '../client/ast'
import { knex } from './db'

function main() {
  let text = ''
  process.stdin
    .on('data', chunk => (text += chunk))
    .on('end', async () => {
      if (!text) {
        console.error('missing erd text from stdin')
        process.exit(1)
      }
      const result = parse(text)

      let code = `
import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
`

      const table_list = result.table_list
      table_list.forEach(self => {
        self.field_list.forEach(field => {
          const ref = field.references
          if (!ref) return

          const other = table_list.find(table => table.name === ref.table)
          if (!other) return

          const selfIndex = table_list.indexOf(self)
          const otherIndex = table_list.indexOf(other)

          if (otherIndex <= selfIndex) return

          table_list[otherIndex] = self
          table_list[selfIndex] = other
        })
      })

      table_list.forEach(table => {
        code += `
  if (!(await knex.schema.hasTable('${table.name}'))) {
    await knex.schema.createTable('${table.name}', table => {`
        table.field_list.forEach(field => {
          const type = field.type

          code += `
      table.${type}('${field.name}')`

          if (field.is_primary_key) {
            if (type === 'integer') {
              code += `.unsigned()`
            }
            code += `.primary()`
          } else {
            if (field.is_null) {
              code += `.nullable()`
            } else {
              code += `.notNullable()`
            }
          }

          const ref = field.references
          if (ref) {
            code += `.references('${ref.table}.${ref.field}')`
          }
        })
        code += `
      table.timestamps(false, true)
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

      console.log(code)

      await knex.destroy()
    })
}

main()
