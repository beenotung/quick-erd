import { inspect } from 'util'
import { parse } from '../core/ast'
import { toTsType } from '../core/ts-type'
import { sortTables } from './sort-tables'

export function textToTypes(text: string) {
  const result = parse(text)
  const table_list = sortTables(result.table_list)

  let tableTypes = ''
  let proxyFields = ''
  let schemaFields = ''

  table_list.forEach(table => {
    const typeName = toTypeName(table.name)
    let virtualFields = ''

    tableTypes += `
export type ${typeName} = {`

    table.field_list.forEach(field => {
      const type = toTsType(field.type)
      if (field.is_primary_key) {
        tableTypes += `
  ${field.name}?: null | ${type}`
      } else if (field.is_null) {
        tableTypes += `
  ${field.name}: null | ${type}`
      } else {
        tableTypes += `
  ${field.name}: ${type}`
      }

      if (field.default_value) {
        tableTypes += ` // default: ${field.default_value}`
      }

      if (field.references) {
        const typeName = toTypeName(field.references.table)
        let name = field.name.replace(/_id$/, '')
        if (name === 'id') {
          name = field.references.table
        }
        tableTypes += `
  ${name}?: ${typeName}`

        name = inspect(name)
        const refField = inspect(field.name)
        const table = inspect(field.references.table)
        virtualFields += `
      [${name}, { field: ${refField}, table: ${table} }],`
      }
    })

    tableTypes += `
}
`

    proxyFields += `
  ${table.name}: ${typeName}[]`

    if (virtualFields) {
      schemaFields += `
    ${table.name}: [
      /* foreign references */${virtualFields}
    ],`
    } else {
      schemaFields += `
    ${table.name}: [],`
    }
  })

  return { tableTypes, proxyFields, schemaFields }
}

export function trimCode(code: string) {
  return code
    .replace(/{\n\n/g, '{\n')
    .replace(/\n\n\n/g, '\n\n')
    .trim()
}

export function toTypeName(name: string): string {
  return name
    .split('_')
    .map(part => part[0].toLocaleUpperCase() + part.slice(1))
    .join('')
}
