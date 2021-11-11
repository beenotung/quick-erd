import { Field } from '../src/client/ast'
import { parseTable } from '../src/client/sqlite-parser'

function test(sql: string, fields: Field[]) {
  console.log('== test == ')
  let result = parseTable(sql)
  if (JSON.stringify(result) !== JSON.stringify(fields)) {
    console.debug('fail')
    console.debug(sql)
    console.debug(result)
    process.exit(1)
  }
  console.debug('pass')
}

test(
  `
CREATE TABLE test (
id integer primary key
, content text)
`,
  [
    {
      name: 'id',
      type: 'integer',
      is_primary_key: true,
      is_null: false,
      references: undefined,
    },
    {
      name: 'content',
      type: 'text',
      is_primary_key: false,
      is_null: false,
      references: undefined,
    },
  ],
)

test(
  `
CREATE TABLE "user" (
	"id"	INTEGER,
	"username"	TEXT,
	PRIMARY KEY("id")
)
`,
  [
    {
      name: 'id',
      type: 'integer',
      is_primary_key: true,
      is_null: false,
      references: undefined,
    },
    {
      name: 'username',
      type: 'text',
      is_primary_key: false,
      is_null: false,
      references: undefined,
    },
  ],
)

test(
  `
CREATE TABLE "post" (
	"id"	INTEGER,
	"content"	TEXT, user_id REFERENCES user(id),
	PRIMARY KEY("id")
)
`,
  [
    {
      name: 'id',
      type: 'integer',
      is_primary_key: true,
      is_null: false,
      references: undefined,
    },
    {
      name: 'content',
      type: 'text',
      is_primary_key: false,
      is_null: false,
      references: undefined,
    },
    {
      name: 'user_id',
      type: '',
      is_primary_key: false,
      is_null: false,
      references: { table: 'user', field: 'id', type: '>-' },
    },
  ],
)
