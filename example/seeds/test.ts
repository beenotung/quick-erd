import { Knex } from 'knex'

export async function seed(knex: Knex): Promise<void> {
  let [rows, fields] = await knex.raw(`show tables`)
  let name = fields[0].name
  for (let row of rows) {
    let table = row[name]
    console.log({ table })
    let result = await knex.raw(`show create table \`${table}\``)
    let sql: string = result[0][0]['Create Table']
    console.log(sql)
    parseCreateTable(sql)
  }
}

function parseCreateTable(sql: string) {
  let startIdx = sql.indexOf('(')
  let endIdx = sql.lastIndexOf(') ENGINE=')
  sql = sql.slice(startIdx + 1, endIdx).trim()
  for (;;) {
    let field = parseStatement(sql)
    console.log('field:', field)
    sql = field.rest
    if (sql.startsWith(',')) {
      sql = sql.slice(1).trim()
      continue
    }
    if (!sql) {
      break
    }
    throw new Error(`unknown tokens: ${JSON.stringify(sql)}`)
  }
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

function parseStatement(sql: string) {
  /* check named key */
  let is_skip = sql.startsWith('KEY ')
  if (is_skip) {
    sql = nextStatement(sql)
    return { is_skip, rest: sql }
  }

  /* parse primary key */
  let is_primary_key = sql.startsWith('PRIMARY KEY')
  if (is_primary_key) {
    sql = sql.slice('PRIMARY KEY'.length).trim()
    let { name, rest } = parseNameInBracket(sql, 'PRIMARY KEY')
    sql = rest
    if (sql && !sql.startsWith(',')) {
      throw new Error(
        `unknown tokens after PRIMARY KEY: ${JSON.stringify(sql)}`,
      )
    }
    return { is_skip, is_primary_key, name, rest: sql }
  }

  /* parse field name */
  let result = parseName(sql)
  let name = result.name
  sql = result.rest

  /* parse field type */
  let endIdx = sql.indexOf(' ')
  let type = sql.slice(0, endIdx)
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

  return { is_skip, is_primary_key, name, type, not_null, auto_inc, rest: sql }
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
