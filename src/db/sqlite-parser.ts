import { Field, ForeignKeyReference, Table } from '../core/ast'
import { formatEnum } from '../core/enum'

export type SchemaRow = {
  name: string
  sql: string
  type: string
}

export function parseTableSchema(rows: SchemaRow[]): Table[] {
  const table_rows: SchemaRow[] = rows.filter(row => row.type === 'table')
  const index_rows: SchemaRow[] = rows.filter(row => row.type === 'index')

  const table_list: Table[] = []

  table_rows.forEach(row => {
    const field_list = parseCreateTable(row.sql)
    if (!field_list) {
      throw new Error('Failed to parse table: ' + row.sql)
    }
    table_list.push({ name: row.name, field_list: field_list })
  })

  for (const index_row of index_rows) {
    if (!index_row.sql) continue
    const index = parseCreateIndex(index_row.sql)
    const table = table_list.find(table => table.name === index?.table)
    const field = table?.field_list.find(field => field.name === index?.field)
    if (index?.is_unique && field) {
      field.is_unique = true
    }
  }

  return table_list
}

export function parseCreateTable(sql: string): Field[] | null {
  const start = sql.indexOf('(')
  if (start === -1) return null
  const end = sql.lastIndexOf(')')
  if (end === -1) return null
  sql = sql.substring(start + 1, end)
  const field_dict: Record<string, Field> = {}
  parseCreateColumns(sql).forEach(part => {
    let rest = part.trim()
    let lower = rest.toLowerCase()
    if (lower.startsWith('primary key')) {
      const [name] = parseNameInBracket(rest)
      const field = field_dict[name]
      if (field) {
        field.is_primary_key = true
      }
      return
    }
    if (lower.startsWith('foreign key')) {
      const [fieldName, rest1] = parseNameInBracket(rest)
      rest = rest1.trim()
      lower = rest.toLowerCase()
      if (!lower.startsWith('references')) {
        return
      }
      rest = rest.substring('references'.length).trim()
      const [refTable, rest2] = parseName(rest)
      rest = rest2.trim()
      const [refField] = parseNameInBracket(rest)
      const field = field_dict[fieldName]
      if (!field) return
      field.references = { table: refTable, field: refField, type: '>-' }
      return
    }
    let is_null = true
    rest = ' ' + rest + ' '
    lower = rest.toLowerCase()
    if (lower.includes(' not null ')) {
      is_null = false
      const [before, after] = split(rest, lower, ' not null ')
      rest = before + ' ' + after
    } else if (lower.includes(' null ')) {
      const [before, after] = split(rest, lower, ' null ')
      rest = before + ' ' + after
    }
    let is_unique = false
    if (lower.includes(' unique ')) {
      is_unique = true
      const [before, after] = split(rest, lower, ' unique ')
      rest = before + ' ' + after
    }
    rest = rest.trim()
    const [name, rest1] = parseName(rest)
    rest = rest1.trim()
    lower = rest.toLowerCase()
    let type: string
    if (lower.startsWith('references') || lower.startsWith('primary key')) {
      type = ''
    } else {
      const [type2, rest2] = parseName(rest)
      type = type2
      rest = rest2.trim()
      const num = rest.match(/^(\d+\))/)
      if (num) {
        type += '(' + num[1]
        rest = rest.slice(num[1].length)
      }
      lower = rest.toLowerCase()
    }
    let is_primary_key = false
    if (lower.includes('primary key')) {
      const start = lower.indexOf('primary key')
      const end = start + 'primary key'.length
      const before = rest.substring(0, start)
      const after = rest.substring(end)
      rest = (before + after).trim()
      lower = rest.toLowerCase()
      is_primary_key = true
    }
    let references: ForeignKeyReference | undefined = undefined
    if (lower.includes('references')) {
      const start = lower.indexOf('references')
      const end = start + 'references'.length
      const before = rest.substring(0, start)
      let after = rest.substring(end).trim()
      const [table, rest3] = parseName(after)
      after = rest3.trim()
      const [field, rest4] = parseNameInBracket(after)
      after = rest4.trim()
      references = { table, field, type: '>-' }
      rest = before + after
      lower = rest.toLowerCase()
    }
    let default_value: string | undefined = undefined
    if (lower.includes('default')) {
      const start = lower.indexOf('default')
      const end = start + 'default'.length
      const before = rest.substring(0, start)
      const after = rest.substring(end).trim()
      default_value = parseDefaultValue(after)
      if (default_value) {
        rest = before + after.slice(default_value.length)
      }
    }
    if (lower.match(/check.*in.*/)) {
      let match = rest.match(/check(.*)/i)?.[1].trim() || ''
      if (match.startsWith('(') && match.endsWith(')')) {
        match = match.slice(1, match.length - 1)
      }
      const matches = match.match(/"?`?(.*?)"?`?\s*in\s*\((.*)\)/i)
      if (matches?.[1] === name) {
        type = 'enum(' + matches[2] + ')'
        type = formatEnum(type)
      }
    }
    field_dict[name] = {
      name,
      type: type.startsWith('enum(') ? type : type.toLowerCase(),
      is_primary_key,
      is_null,
      is_unique,
      is_unsigned: false,
      default_value,
      references,
    }
  })
  return Object.values(field_dict)
}

function parseCreateColumns(sql: string): string[] {
  const columns: string[] = []
  let buffer = ''
  let level = 0
  sql.split('').forEach(c => {
    switch (c) {
      case '(':
        level++
        buffer += c
        break
      case ')':
        level--
        buffer += c
        break
      case ',':
        if (level === 0) {
          columns.push(buffer)
          buffer = ''
        } else {
          buffer += c
        }
        break
      default:
        buffer += c
    }
  })
  columns.push(buffer)
  return columns.map(column => column.trim()).filter(column => column)
}

type UniqueIndex = {
  is_unique: true
  table: string
  field: string
}
function parseCreateIndex(sql: string): UniqueIndex | null {
  // example: CREATE UNIQUE INDEX `user_username_unique` on `user` (`username`)
  let match = sql.match(
    /create unique index .* on \`?(.*?)\`? \(\`?(.*?)\`?\)/i,
  )
  // example: CREATE UNIQUE INDEX "user_username_unique" on "user" (\n  "username"\n)
  if (!match)
    match = sql.match(
      /create unique index .* on "?(.*?)"? \("?([.|\s|\S]*?)"?\)/i,
    )
  if (!match) return null
  const table = match[1]
  let field = match[2].trim()
  if (field.startsWith('"') && field.endsWith('"')) {
    field = field.slice(1, -1)
  }
  if (field.includes(',')) {
    return null
  }
  return { table, field, is_unique: true }
}

function firstIndexOf(string: string, patterns: string[], offset = 0): number {
  const index_list = patterns
    .map(pattern => string.indexOf(pattern, offset))
    .filter(index => index !== -1)
    .sort((a, b) => a - b)
  return index_list.length === 0 ? -1 : index_list[0]
}

function parseDefaultValue(sql: string) {
  if (sql[0] === '"') {
    const end = sql.indexOf('"', 1)
    return sql.slice(0, end + 1)
  }
  if (sql[0] === "'") {
    const end = sql.indexOf("'", 1)
    return sql.slice(0, end + 1)
  }
  if (sql[0] === '`') {
    const end = sql.indexOf('`', 1)
    return sql.slice(0, end + 1)
  }
  return sql.match(/[\w-_()]+/)?.[0]
}

function parseName(sql: string) {
  let start: number
  let end: number
  if (sql[0] === '"') {
    start = 1
    end = sql.indexOf('"', 1)
  } else if (sql[0] === '`') {
    start = 1
    end = sql.indexOf('`', 1)
  } else {
    start = 0
    end = firstIndexOf(sql, [' ', '('])
  }
  if (end === -1) {
    end = sql.length
  }
  const name = sql.substring(start, end)
  const rest = sql.substring(end + 1)
  return [name, rest] as const
}

function parseNameInBracket(sql: string) {
  const start = sql.indexOf('(')
  const end = sql.indexOf(')', start)
  const middle = sql.substring(start + 1, end).trim()
  const after = sql.substring(end + 1)
  const [name] = parseName(middle)
  return [name, after]
}

function split(sql: string, lower: string, separator: string) {
  const start = lower.indexOf(separator)
  const end = start + separator.length
  const before = sql.substring(0, start)
  const after = sql.substring(end)
  return [before, after] as const
}
