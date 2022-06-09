import { inspect } from 'util'
import { parse } from '../core/ast'
import { sortTables } from './sort-tables'

export function textToSqliteProxy(text: string): string {
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
      const nullable = field.is_primary_key || field.is_null ? '?' : ''
      tableTypes += `
  ${field.name}${nullable}: ${type}`

      if (field.references) {
        const typeName = toTypeName(field.references.table)
        let name = field.name.replace(/_id$/, '')
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
  ${table.name}: ${typeName}[],`

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

  const code = `
import { proxySchema } from 'better-sqlite3-proxy'
import { db } from './db'

${tableTypes}

export type DBProxy = {
${proxyFields}
}

export let proxy = proxySchema<DBProxy>(db, {
${schemaFields}
})
`

  return code.replace(/{\n\n/g, '{\n')
}

function toTypeName(name: string): string {
  return name
    .split('_')
    .map(part => part[0].toLocaleUpperCase() + part.slice(1))
    .join('')
}

function toTsType(type: string): string {
  if (
    type.match(/^varchar/i) ||
    type.match(/^string/i) ||
    type.match(/^text/i)
  ) {
    return 'string'
  }
  if (
    type.match(/^int/i) ||
    type.match(/^float/i) ||
    type.match(/^double/i) ||
    type.match(/^real/i)
  ) {
    return 'number'
  }
  if (type.match(/^bool/i)) {
    return 'boolean'
  }
  if (type.match(/^enum/i)) {
    return type.replace(/^enum/i, '').split(',').join(' | ')
  }
  if (type.match(/^date/i) || type.match(/^time/i)) {
    return 'string'
  }
  return 'string // ' + type
}
