import { Field, ForeignKeyReference } from '../core/ast'

export function parseCreateTable(sql: string): Field[] {
  const startIdx = sql.indexOf('(')
  const endIdx = sql.lastIndexOf(') ENGINE=')
  sql = sql.slice(startIdx + 1, endIdx).trim()
  const field_list: Field[] = []
  const primary_key_set = new Set<string>()
  const unique_key_set = new Set<string[]>()
  const foreign_key_map = new Map<string, ForeignKeyReference>()
  for (;;) {
    const field = parseStatement(sql)
    sql = field.rest
    if (field.is_skip === false) {
      if (field.is_primary_key === true) {
        primary_key_set.add(field.name)
      } else if (field.is_unique_key) {
        unique_key_set.add(field.fields)
      } else if (field.is_foreign_key === true) {
        foreign_key_map.set(field.field, {
          type: '>-',
          table: field.ref_table,
          field: field.ref_field,
        })
      } else {
        field_list.push({
          name: field.name,
          type: field.type,
          is_primary_key: field.is_primary_key,
          is_unsigned: field.unsigned,
          is_null: !field.not_null,
          is_unique: false,
          references: undefined,
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
    for (const field of field_list) {
      if (unique_fields.includes(field.name)) {
        field.is_unique = true
      }
    }
  }
  for (const [name, ref] of foreign_key_map.entries()) {
    const field = field_list.find(field => field.name === name)
    if (field) {
      field.references = ref
    }
  }
  return field_list
}

function nextPart(sql: string) {
  const startIdx = sql.indexOf(' ')
  const endIdx1 = sql.indexOf(' ', startIdx + 1)
  const endIdx2 = sql.indexOf(',', startIdx + 1)
  const endIdx =
    endIdx1 === -1
      ? endIdx2
      : endIdx2 === -1
      ? endIdx1
      : Math.min(endIdx1, endIdx2)
  sql = sql.slice(endIdx).trim()
  return sql
}

function nextStatement(sql: string) {
  const idx = sql.indexOf(',')
  if (idx === -1) {
    return ''
  }
  return sql.slice(idx).trim()
}

type Statement =
  | {
      is_skip: true
      rest: string
    }
  | {
      is_skip: false
      is_primary_key: true
      name: string
      rest: string
    }
  | {
      is_skip: false
      is_primary_key: false
      is_unique_key: true
      fields: string[]
      rest: string
    }
  | {
      is_skip: false
      is_primary_key: false
      is_unique_key: false
      is_foreign_key: false
      name: string
      type: string
      not_null: boolean
      auto_inc: boolean
      unsigned: boolean
      rest: string
    }
  | {
      is_skip: false
      is_primary_key: false
      is_unique_key: false
      is_foreign_key: true
      field: string
      ref_table: string
      ref_field: string
      rest: string
    }

function parseStatement(sql: string): Statement {
  /* check named key */
  const is_skip = sql.startsWith('KEY ')
  if (is_skip) {
    sql = nextStatement(sql)
    return { is_skip, rest: sql }
  }

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
  const endIdx = sql.indexOf(' ')
  let type = sql.slice(0, endIdx)
  type = toDataType(type)
  sql = sql.slice(endIdx + 1).trim()

  /* parse unsigned */
  const unsigned = sql.startsWith('unsigned')
  if (unsigned) {
    sql = sql.slice('unsigned'.length).trim()
  }

  /* parse text collection (encoding) */
  if (sql.startsWith('COLLATE')) {
    sql = nextPart(sql)
  }

  /* parse not null */
  const not_null = sql.startsWith('NOT NULL')
  if (not_null) {
    sql = sql.slice('NOT NULL'.length).trim()
  }

  /* parse default value */
  if (sql.startsWith('DEFAULT')) {
    sql = nextPart(sql)
  }

  /* parse on update */
  if (sql.startsWith('ON UPDATE')) {
    sql = sql.slice(3)
    sql = nextPart(sql)
  }

  /* parse auto increment */
  const auto_inc = sql.startsWith('AUTO_INCREMENT')
  if (auto_inc) {
    sql = sql.slice('AUTO_INCREMENT'.length).trim()
  }

  const has_comment = sql.startsWith('COMMENT')
  if (has_comment) {
    sql = parseComment(sql)
  }

  return {
    is_skip: false,
    is_primary_key: false,
    is_unique_key: false,
    is_foreign_key: false,
    name,
    type,
    unsigned,
    not_null,
    auto_inc,
    rest: sql,
  }
}
function parsePrimaryKeyStatement(sql: string): Statement {
  sql = sql.slice('PRIMARY KEY'.length).trim()
  const { name, rest } = parseNameInBracket(sql, 'PRIMARY KEY')
  sql = rest
  if (sql && !sql.startsWith(',')) {
    throw new Error(`unknown tokens after PRIMARY KEY: ${JSON.stringify(sql)}`)
  }
  return { is_skip: false, is_primary_key: true, name, rest: sql }
}
function parseUniqueKeyStatement(sql: string): Statement {
  sql = sql.slice('UNIQUE KEY'.length).trim()

  /* parse unique key name */
  let result = parseName(sql)
  sql = result.rest.trim()

  /* parse column names */
  // TODO parse multiple columns
  result = parseNameInBracket(sql, 'UNIQUE KEY')
  sql = result.rest.trim()
  if (sql && !sql.startsWith(',')) {
    throw new Error(`unknown tokens after UNIQUE KEY: ${JSON.stringify(sql)}`)
  }
  const fields: string[] = [result.name]
  return {
    is_skip: false,
    is_primary_key: false,
    is_unique_key: true,
    fields,
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
  for (; sql.length > 0; ) {
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

function toDataType(type: string): string {
  if (type.includes('character varying')) {
    return 'string'
  }
  if (type.includes('timestamp')) {
    return 'timestamp'
  }
  return type
}
