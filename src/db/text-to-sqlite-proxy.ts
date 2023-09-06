import { textToTypes, trimCode } from './text-to-types'

export function textToSqliteProxy(
  text: string,
  options?: {
    mode?: 'factory' | 'singleton' // default as singleton
    type?: 'commonjs' | 'module'
  },
): string {
  const mode = options?.mode || 'singleton'
  const type = options?.type || 'commonjs'

  const { tableTypes, proxyFields, schemaFields } = textToTypes(text)

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

  return trimCode(code)
}
