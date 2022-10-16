import { inspect } from 'util'
import { parse } from '../core/ast'
import { sortTables } from './sort-tables'

export function textToSqliteProxy(
  text: string,
  options?: {
    mode?: 'factory' | 'singleton' // default as singleton
    type?: 'commonjs' | 'module'
  },
): string {
  const mode = options?.mode || 'singleton'
  const type = options?.type || 'commonjs'
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
  ${field.name}?: ${type} | null`
      } else if (field.is_null) {
        tableTypes += `
  ${field.name}: ${type} | null`
      } else {
        tableTypes += `
  ${field.name}: ${type}`
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

  let code = ''

  if (mode === 'singleton') {
    const importPath = type === 'commonjs' ? './db' : './db.js'
    code += `
import { proxySchema } from 'better-sqlite3-proxy'
import { db } from '${importPath}'
`
  } else if (mode === 'factory') {
    code += `
import { proxySchema, ProxySchemaOptions } from 'better-sqlite3-proxy'
`
  } else {
    throw new TypeError('unknown mode: ' + mode)
  }

  code += `
${tableTypes}

export type DBProxy = {
${proxyFields}
}
`

  if (mode === 'singleton') {
    code += `
export let proxy = proxySchema<DBProxy>({
  db,
  tableFields: {
${schemaFields}
  },
})
`
  } else if (mode === 'factory') {
    code += `
export let tableFields: ProxySchemaOptions<DBProxy>['tableFields'] = {
${schemaFields}
}

export function createProxy(
  options: Omit<ProxySchemaOptions<DBProxy>, 'tableFields'>,
) {
  return proxySchema<DBProxy>({
    tableFields,
    ...options,
  })
}
`
  } else {
    throw new TypeError('unknown mode: ' + mode)
  }

  return code
    .replace(/{\n\n/g, '{\n')
    .replace(/\n\n\n/g, '\n\n')
    .trim()
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
  if (type.match(/^blob/i)) {
    return 'Buffer'
  }
  return 'string // ' + type
}
