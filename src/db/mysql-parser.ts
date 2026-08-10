import { Field, ForeignKeyReference } from '../core/ast'
import { firstIndexOf } from '../utils/string'

export type ParseCreateTableResult = {
  field_list: Field[]
  unique_field_lists: string[][]
  index_field_lists: string[][]
}

export function parseCreateTable(sql: string): ParseCreateTableResult {
  const startIdx = sql.indexOf('(')
  const endIdx = sql.lastIndexOf(') ENGINE=')
  sql = sql.slice(startIdx + 1, endIdx).trim()
  const field_list: Field[] = []
  const primary_key_set = new Set<string>()
  const unique_key_set = new Set<string[]>()
  const index_key_set = new Set<string[]>()
  const foreign_key_map = new Map<string, ForeignKeyReference>()
  for (;;) {
    const field = parseStatement(sql)
    sql = field.rest
    if (field.is_skip === false) {
      if (field.is_primary_key === true) {
        for (const name of field.fields) {
          primary_key_set.add(name)
        }
      } else if (field.is_unique_key === true) {
        unique_key_set.add(field.fields)
      } else if (field.is_index_key === true) {
        index_key_set.add(field.fields)
      } else if (field.is_foreign_key === true) {
        foreign_key_map.set(field.field, {
          type: '>0-',
          table: field.ref_table,
          field: field.ref_field,
        })
      } else {
        field_list.push({
          name: field.name,
          type: field.type,
          is_primary_key: field.is_primary_key,
          is_unsigned: field.unsigned,
          is_zerofill: false,
          is_null: !field.not_null,
          is_unique: false,
          is_index: false,
          references: undefined,
          default_value: field.default_value,
          collate: field.collate,
        })
      }
    }
    if (sql.startsWith(',')) {
      sql = sql.slice(1).trim()
      continue
    }
    if (!sql) {
      break
    }
    throw new Error(`unknown tokens: ${JSON.stringify(sql)}`)
  }
  for (const name of primary_key_set) {
    const field = field_list.find(field => field.name === name)
    if (field) {
      field.is_primary_key = true
    }
  }
  for (const unique_fields of unique_key_set) {
    if (unique_fields.length > 1) continue
    const field = field_list.find(field => field.name === unique_fields[0])
    if (field) {
      field.is_unique = true
    }
  }
  for (const index_fields of index_key_set) {
    if (index_fields.length > 1) continue
    const field = field_list.find(field => field.name === index_fields[0])
    if (field) {
      field.is_index = true
    }
  }
  for (const [name, ref] of foreign_key_map.entries()) {
    const field = field_list.find(field => field.name === name)
    if (field) {
      field.references = ref
    }
  }
  return {
    field_list,
    unique_field_lists: Array.from(unique_key_set).filter(fields => fields.length > 1),
    index_field_lists: Array.from(index_key_set).filter(fields => fields.length > 1),
  }
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
  const match = sql.match(/[\w-_()]+/)
  if (!match) throw new Error('failed to parse default value')
  return match[0]
}

function nextPart(sql: string) {
  const startIdx = sql.indexOf(' ')
  const endIdx = firstIndexOf(sql, [' ', ','], startIdx + 1)
  sql = sql.slice(endIdx).trim()
  return sql
}

type Statement =
  | {
      is_skip: true
      rest: string
    }
  | {
      is_skip: false
      is_primary_key: true
      fields: string[]
      rest: string
    }
  | {
      is_skip: false
      is_primary_key: false
      is_unique_key: true
      is_index_key: false
      fields: string[]
      rest: string
    }
  | {
      is_skip: false
      is_primary_key: false
      is_unique_key: false
      is_index_key: true
      fields: string[]
      rest: string
    }
  | {
      is_skip: false
      is_primary_key: false
      is_unique_key: false
      is_index_key: false
      is_foreign_key: false
      name: string
      type: string
      not_null: boolean
      auto_inc: boolean
      unsigned: boolean
      default_value: string | undefined
      collate: string | undefined
      rest: string
    }
  | {
      is_skip: false
      is_primary_key: false
      is_unique_key: false
      is_index_key: false
      is_foreign_key: true
      field: string
      ref_table: string
      ref_field: string
      rest: string
    }

function parseStatement(sql: string): Statement {
  /* parse primary key */
  const is_primary_key = sql.startsWith('PRIMARY KEY')
  if (is_primary_key) {
    return parsePrimaryKeyStatement(sql)
  }

  /* parse unique key */
  const is_unique_key = sql.startsWith('UNIQUE KEY')
  if (is_unique_key) {
    return parseUniqueKeyStatement(sql)
  }

  /* parse index */
  const is_index = sql.startsWith('INDEX') || sql.startsWith('KEY ')
  if (is_index) {
    return parseIndexStatement(sql)
  }

  /* parse foreign key constraint */
  const is_constraint = sql.startsWith('CONSTRAINT')
  if (is_constraint) {
    return parseConstraintStatement(sql)
  }

  return parseColumnStatement(sql)
}
function parseColumnStatement(sql: string): Statement {
  /* parse field name */
  const result = parseName(sql)
  const name = result.name
  sql = result.rest

  /* parse field type */
  let endIdx = firstIndexOf(sql, [' ', ','])
  if (endIdx === -1) endIdx = sql.length
  let type = sql.slice(0, endIdx)
  type = toDataType(type)
  sql = sql.slice(endIdx).trim()

  /* parse unsigned */
  const unsigned = sql.startsWith('unsigned')
  if (unsigned) {
    sql = sql.slice('unsigned'.length).trim()
  }

  let not_null = false
  let auto_inc = false
  let default_value = undefined
  let collate: string | undefined = undefined

  for (;;) {
    /* parse text collation (encoding) */
    if (sql.startsWith('COLLATE')) {
      sql = sql.slice('COLLATE'.length).trim()
      const match = sql.match(/^[\w-]+/)
      if (match) {
        collate = match[0]
        sql = sql.slice(collate.length).trim()
      }
      continue
    }

    /* parse not null */
    if (sql.startsWith('NOT NULL')) {
      not_null = true
      sql = sql.slice('NOT NULL'.length).trim()
      continue
    }

    /* parse null */
    if (sql.startsWith('NULL')) {
      not_null = false
      sql = sql.slice('NULL'.length).trim()
      continue
    }

    /* parse default value */
    if (sql.startsWith('DEFAULT')) {
      sql = sql.slice('DEFAULT'.length).trim()
      default_value = parseDefaultValue(sql)
      sql = sql.slice(default_value.length).trim()
      continue
    }

    /* parse on update */
    if (sql.startsWith('ON UPDATE')) {
      sql = sql.slice(3)
      sql = nextPart(sql)
      continue
    }

    /* parse auto increment */
    if (sql.startsWith('AUTO_INCREMENT')) {
      auto_inc = true
      sql = sql.slice('AUTO_INCREMENT'.length).trim()
      continue
    }

    const has_comment = sql.startsWith('COMMENT')
    if (has_comment) {
      sql = parseComment(sql)
      continue
    }

    break
  }

  return {
    is_skip: false,
    is_primary_key: false,
    is_unique_key: false,
    is_index_key: false,
    is_foreign_key: false,
    name,
    type,
    unsigned,
    not_null,
    auto_inc,
    default_value,
    collate,
    rest: sql,
  }
}
function parsePrimaryKeyStatement(sql: string): Statement {
  sql = sql.slice('PRIMARY KEY'.length).trim()
  const namesResult = parseNamesInBracket(sql, 'PRIMARY KEY')
  sql = namesResult.rest
  if (sql && !sql.startsWith(',')) {
    throw new Error(`unknown tokens after PRIMARY KEY: ${JSON.stringify(sql)}`)
  }
  return {
    is_skip: false,
    is_primary_key: true,
    fields: namesResult.names,
    rest: sql,
  }
}
function parseUniqueKeyStatement(sql: string): Statement {
  sql = sql.slice('UNIQUE KEY'.length).trim()

  /* parse unique key name */
  let result = parseName(sql)
  sql = result.rest.trim()

  /* parse column names */
  let namesResult = parseNamesInBracket(sql, 'UNIQUE KEY')
  sql = namesResult.rest.replace(/using hash/i, '').trim()
  if (sql && !sql.startsWith(',')) {
    throw new Error(`unknown tokens after UNIQUE KEY: ${JSON.stringify(sql)}`)
  }
  return {
    is_skip: false,
    is_primary_key: false,
    is_unique_key: true,
    is_index_key: false,
    fields: namesResult.names,
    rest: sql,
  }
}
function parseIndexStatement(sql: string): Statement {
  sql = sql.replace(/^(INDEX|KEY)/, '').trim()

  /* parse index key name */
  let result = parseName(sql)
  sql = result.rest.trim()

  /* parse column names */
  let namesResult = parseNamesInBracket(sql, 'INDEX')
  sql = namesResult.rest.replace(/using hash/i, '').trim()
  if (sql && !sql.startsWith(',')) {
    throw new Error(`unknown tokens after INDEX: ${JSON.stringify(sql)}`)
  }
  return {
    is_skip: false,
    is_primary_key: false,
    is_unique_key: false,
    is_index_key: true,
    fields: namesResult.names,
    rest: sql,
  }
}
function parseConstraintStatement(sql: string): Statement {
  sql = sql.slice('CONSTRAINT'.length).trim()

  /* parse constrain name */
  let result = parseName(sql)
  sql = result.rest.trim()

  /* parse constraint type */
  const is_foreign_key = sql.startsWith('FOREIGN KEY')
  if (!is_foreign_key) {
    throw new Error('unknown type of constraint')
  }
  sql = sql.slice('FOREIGN KEY'.length).trim()

  /* parse own field name */
  result = parseNameInBracket(sql, 'FOREIGN KEY own field')
  const field = result.name
  sql = result.rest.trim()

  /* parse 'REFERENCES' keyword */
  const is_references = sql.startsWith('REFERENCES')
  if (!is_references) {
    throw new Error("missing 'REFERENCES' in foreign key constraint")
  }
  sql = sql.slice('REFERENCES'.length).trim()

  /* parse reference table name */
  result = parseName(sql)
  const ref_table = result.name
  sql = result.rest.trim()

  /* parse reference field name */
  result = parseNameInBracket(sql, 'FOREIGN KEY reference field name')
  const ref_field = result.name
  sql = result.rest.trim()

  return {
    is_skip: false,
    is_primary_key: false,
    is_unique_key: false,
    is_index_key: false,
    is_foreign_key: true,
    field,
    ref_table,
    ref_field,
    rest: sql,
  }
}
function parseComment(sql: string) {
  sql = sql.slice('COMMENT'.length).trim()
  if (!sql.startsWith("'")) {
    throw new Error(`missing starting "'" for comment`)
  }
  sql = sql.slice(1)
  for (; sql.length > 0;) {
    if (sql.startsWith("''")) {
      sql = sql.slice(2)
      continue
    }
    if (sql[0] === '\\') {
      sql = sql.slice(2)
      continue
    }
    if (sql[0] === "'") {
      sql = sql.slice(1)
      return sql.trim()
    }
    sql = sql.slice(1)
  }
  throw new Error(`missing ending "'" for comment`)
}

function parseName(sql: string) {
  const startIdx = sql.indexOf('`')
  if (startIdx !== 0) {
    const tokens = sql.slice(0, startIdx)
    throw new Error(`unknown tokens: ${JSON.stringify(tokens)}`)
  }
  const endIdx = sql.indexOf('`', startIdx + 1)
  const name = sql.slice(startIdx + 1, endIdx)
  sql = sql.slice(endIdx + 1).trim()
  return { name, rest: sql }
}

function parseNameInBracket(sql: string, context: string) {
  if (!sql.startsWith('(')) {
    throw new Error(`missing '(' for ${context}`)
  }
  sql = sql.slice(1)
  const result = parseName(sql)
  sql = result.rest
  if (!sql.startsWith(')')) {
    throw new Error(`missing ')' for ${context}`)
  }
  sql = sql.slice(1)
  return { name: result.name, rest: sql }
}

function parseNamesInBracket(sql: string, context: string): { names: string[]; rest: string } {
  if (!sql.startsWith('(')) {
    throw new Error(`missing '(' for ${context}`)
  }
  sql = sql.slice(1)
  const names: string[] = []
  while (!sql.startsWith(')')) {
    const result = parseName(sql)
    names.push(result.name)
    sql = result.rest.trim()
    if (sql.startsWith(',')) {
      sql = sql.slice(1).trim()
    }
  }
  sql = sql.slice(1)
  return { names, rest: sql }
}

function toDataType(type: string): string {
  if (type.includes('character varying')) {
    return 'string'
  }
  if (type.includes('timestamp')) {
    return 'timestamp'
  }
  return type
}
