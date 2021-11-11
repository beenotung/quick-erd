import { Field } from './ast'

export function parseTable(sql: string): Field[] | null {
  const start = sql.indexOf('(')
  if (start === -1) return null
  const end = sql.lastIndexOf(')')
  if (end === -1) return null
  sql = sql.substring(start + 1, end)
  const field_dict: Record<string, Field> = {}
  sql.split(',').forEach(part => {
    let rest = part.trim()
    if (rest.toLowerCase().startsWith('primary key')) {
      const start = rest.indexOf('(')
      const end = rest.indexOf(')')
      rest = rest.substring(start + 1, end)
      const [name] = parseName(rest)
      const field = field_dict[name]
      if (field) {
        field.is_primary_key = true
      }
      return
    }
    const [name, rest1] = parseName(rest)
    rest = rest1.trim()
    const [type, rest2] = parseName(rest)
    rest = rest2.trim()
    let is_primary_key = false
    const lower = rest.toLowerCase()
    if (lower.includes('primary key')) {
      const start = lower.indexOf('primary key')
      const before = rest.substring(0, start)
      const after = rest.substring(start + 'primary key'.length)
      console.log('before:', rest)
      rest = before + after
      console.log('after:', rest)
      is_primary_key = true
    }
    field_dict[name] = {
      name,
      type: type.toLowerCase(),
      is_primary_key,
      is_null: false,
      references: undefined,
    }
  })
  return Object.values(field_dict)
}
function parseName(sql: string) {
  let start: number
  let end: number
  if (sql[0] === '"') {
    start = 1
    end = sql.indexOf('"', 1)
  } else {
    start = 0
    end = sql.indexOf(' ')
  }
  if (end === -1) {
    end = sql.length
  }
  const name = sql.substring(start, end)
  const rest = sql.substring(end + 1)
  return [name, rest] as const
}
