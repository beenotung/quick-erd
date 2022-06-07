import { parse } from '../core/ast'
import { sortTables } from './sort-tables'

export function textToSqliteProxy(text: string): string {
  const result = parse(text)
  const table_list = sortTables(result.table_list)

  let code = `
import { proxySchema } from 'better-sqlite3-proxy'
import { db } from './db'
`

  table_list.forEach(table => {
    let typeName = toTypeName(table.name)
    code += `
export type ${typeName} = {`
    table.field_list.forEach(field => {
      let type = toTsType(field.type)
      let nullable = field.is_primary_key || field.is_null ? '?' : ''
      code += `
  ${field.name}${nullable}: ${type}`
    })
    code += `
}
`
  })

  code += `
export type DBProxy = {`
  table_list.forEach(table => {
    let typeName = toTypeName(table.name)
    code += `
  ${table.name}: ${typeName}[],`
  })
  code += `
}
`

  code += `
export let proxy = proxySchema<DBProxy>(db, {`
  table_list.forEach(table => {
    code += `
  ${table.name}: [],`
    // TODO auto setup foreign key references
    //   code += `
    // ${table.name}: [
    //   /*  */
    //   ['1',{ field: '', table: '' }],
    // ],`
  })
  code += `
})
`

  return code
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
