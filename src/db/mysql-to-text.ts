import { Field, ForeignKeyReference, Table } from '../core/ast'
import { knex } from './knex'

export async function scanMysqlTableSchema(): Promise<Table[]> {
  const table_list: Table[] = []

  let [rows, fields] = await knex.raw(`show tables`)
  let name = fields[0].name
  for (let row of rows) {
    let table = row[name]
    let result = await knex.raw(`show create table \`${table}\``)
    let sql: string = result[0][0]['Create Table']
    let field_list = parseCreateTable(sql)
    table_list.push({ name: table, field_list })
  }

  return table_list
}

function parseCreateTable(sql: string): Field[] {
  let startIdx = sql.indexOf('(')
  let endIdx = sql.lastIndexOf(') ENGINE=')
  sql = sql.slice(startIdx + 1, endIdx).trim()
  let field_list: Field[] = []
  let primary_key_set = new Set<string>()
  let foreign_key_map = new Map<string, ForeignKeyReference>()
  for (;;) {
    let field = parseStatement(sql)
    sql = field.rest
    if (field.is_skip === false) {
      if (field.is_primary_key === true) {
        primary_key_set.add(field.name)
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
          is_null: !field.not_null,
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
  for (let name of primary_key_set) {
    let field = field_list.find(field => field.name === name)
    if (field) {
      field.is_primary_key = true
    }
  }
  for (let [name, ref] of foreign_key_map.entries()) {
    let field = field_list.find(field => field.name === name)
    if (field) {
      field.references = ref
    }
  }
  return field_list
}

function nextPart(sql: string) {
  let startIdx = sql.indexOf(' ')
  let endIdx1 = sql.indexOf(' ', startIdx + 1)
  let endIdx2 = sql.indexOf(',', startIdx + 1)
  let endIdx =
    endIdx1 === -1
      ? endIdx2
      : endIdx2 === -1
      ? endIdx1
      : Math.min(endIdx1, endIdx2)
  sql = sql.slice(endIdx).trim()
  return sql
}

function nextStatement(sql: string) {
  let idx = sql.indexOf(',')
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
      is_foreign_key: false
      name: string
      type: string
      not_null: boolean
      auto_inc: boolean
      rest: string
    }
  | {
      is_skip: false
      is_primary_key: false
      is_foreign_key: true
      field: string
      ref_table: string
      ref_field: string
      rest: string
    }

function parseStatement(sql: string): Statement {
  /* check named key */
  let is_skip = sql.startsWith('KEY ')
  if (is_skip) {
    sql = nextStatement(sql)
    return { is_skip, rest: sql }
  }

  /* parse primary key */
  let is_primary_key = sql.startsWith('PRIMARY KEY')
  if (is_primary_key) {
    return parsePrimaryKeyStatement(sql)
  }

  /* parse foreign key constraint */
  let is_constraint = sql.startsWith('CONSTRAINT')
  if (is_constraint) {
    return parseConstraintStatement(sql)
  }

  return parseColumnStatement(sql)
}
function parseColumnStatement(sql: string): Statement {
  /* parse field name */
  let result = parseName(sql)
  let name = result.name
  sql = result.rest

  /* parse field type */
  let endIdx = sql.indexOf(' ')
  let type = sql.slice(0, endIdx)
  type = toDataType(type)
  sql = sql.slice(endIdx + 1).trim()

  /* parse unsigned */
  if (sql.startsWith('unsigned')) {
    type += ' unsigned'
    sql = sql.slice('unsigned'.length).trim()
  }

  /* parse text collection (encoding) */
  if (sql.startsWith('COLLATE')) {
    sql = nextPart(sql)
  }

  /* parse not null */
  let not_null = sql.startsWith('NOT NULL')
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
  let auto_inc = sql.startsWith('AUTO_INCREMENT')
  if (auto_inc) {
    sql = sql.slice('AUTO_INCREMENT'.length).trim()
  }

  let has_comment = sql.startsWith('COMMENT')
  if (has_comment) {
    sql = parseComment(sql)
  }

  return {
    is_skip: false,
    is_primary_key: false,
    is_foreign_key: false,
    name,
    type,
    not_null,
    auto_inc,
    rest: sql,
  }
}
function parsePrimaryKeyStatement(sql: string): Statement {
  sql = sql.slice('PRIMARY KEY'.length).trim()
  let { name, rest } = parseNameInBracket(sql, 'PRIMARY KEY')
  sql = rest
  if (sql && !sql.startsWith(',')) {
    throw new Error(`unknown tokens after PRIMARY KEY: ${JSON.stringify(sql)}`)
  }
  return { is_skip: false, is_primary_key: true, name, rest: sql }
}
function parseConstraintStatement(sql: string): Statement {
  sql = sql.slice('CONSTRAINT'.length).trim()

  /* parse constrain name */
  let result = parseName(sql)
  sql = result.rest.trim()

  /* parse constraint type */
  let is_foreign_key = sql.startsWith('FOREIGN KEY')
  if (!is_foreign_key) {
    throw new Error('unknown type of constraint')
  }
  sql = sql.slice('FOREIGN KEY'.length).trim()

  /* parse own field name */
  result = parseNameInBracket(sql, 'FOREIGN KEY own field')
  let field = result.name
  sql = result.rest.trim()

  /* parse 'REFERENCES' keyword */
  let is_references = sql.startsWith('REFERENCES')
  if (!is_references) {
    throw new Error("missing 'REFERENCES' in foreign key constraint")
  }
  sql = sql.slice('REFERENCES'.length).trim()

  /* parse reference table name */
  result = parseName(sql)
  let ref_table = result.name
  sql = result.rest.trim()

  /* parse reference field name */
  result = parseNameInBracket(sql, 'FOREIGN KEY reference field name')
  let ref_field = result.name
  sql = result.rest.trim()

  return {
    is_skip: false,
    is_primary_key: false,
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
  let startIdx = sql.indexOf('`')
  if (startIdx !== 0) {
    let tokens = sql.slice(0, startIdx)
    throw new Error(`unknown tokens: ${JSON.stringify(tokens)}`)
  }
  let endIdx = sql.indexOf('`', startIdx + 1)
  let name = sql.slice(startIdx + 1, endIdx)
  sql = sql.slice(endIdx + 1).trim()
  return { name, rest: sql }
}

function parseNameInBracket(sql: string, context: string) {
  if (!sql.startsWith('(')) {
    throw new Error(`missing '(' for ${context}`)
  }
  sql = sql.slice(1)
  let result = parseName(sql)
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
