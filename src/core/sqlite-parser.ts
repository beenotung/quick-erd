import { Field, ForeignKeyReference } from './ast'

export function parseCreateTable(sql: string): Field[] | null {
  const start = sql.indexOf('(')
  if (start === -1) return null
  const end = sql.lastIndexOf(')')
  if (end === -1) return null
  sql = sql.substring(start + 1, end)
  const field_dict: Record<string, Field> = {}
  sql.split(',').forEach(part => {
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
    field_dict[name] = {
      name,
      type: type.toLowerCase(),
      is_primary_key,
      is_null,
      references,
    }
  })
  return Object.values(field_dict)
}

function firstIndexOf(string: string, patterns: string[], offset = 0): number {
  const index_list = patterns
    .map(pattern => string.indexOf(pattern, offset))
    .filter(index => index !== -1)
    .sort((a, b) => a - b)
  return index_list.length === 0 ? -1 : index_list[0]
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
