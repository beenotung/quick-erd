import { Field, Table } from '../core/ast'
import { expect } from 'chai'
import { parseCreateTable, parseTableSchema, SchemaRow } from './sqlite-parser'

describe('sqlite-parser TestSuit', () => {
  it('should parse plain columns', () => {
    const sql = /* sql */ `
create table test (
  id integer
, "content" text
)`
    const ast: Field[] = [
      {
        name: 'id',
        type: 'integer',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'content',
        type: 'text',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse columns with null statement', () => {
    const sql = /* sql */ `
create table test (
  f1 null integer
, f2 integer null
, f3 null
, f4
)`
    const ast: Field[] = [
      {
        name: 'f1',
        type: 'integer',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'f2',
        type: 'integer',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'f3',
        type: '',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'f4',
        type: '',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse columns with not-null statement', () => {
    const sql = /* sql */ `
create table test (
  f1 not null integer
, f2 integer not null
, f3 not null
, f4
)`
    const ast: Field[] = [
      {
        name: 'f1',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'f2',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'f3',
        type: '',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'f4',
        type: '',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse inline primary key', () => {
    const sql = /* sql */ `
create table test (
  id integer primary key
, content text
)`
    const ast: Field[] = [
      {
        name: 'id',
        type: 'integer',
        is_primary_key: true,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'content',
        type: 'text',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })

  it('should parse inline primary key without type', () => {
    const sql = /* sql */ `
create table test (
  id primary key
, content text
)`
    const ast: Field[] = [
      {
        name: 'id',
        type: '',
        is_primary_key: true,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'content',
        type: 'text',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse separated primary key', () => {
    const sql = /* sql */ `
create table test (
  id integer
, content text
, primary key("id")
)`
    const ast: Field[] = [
      {
        name: 'id',
        type: 'integer',
        is_primary_key: true,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'content',
        type: 'text',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse inline foreign key', () => {
    const sql = /* sql */ `
create table test (
  id integer
, user_id integer references user(id)
, post_id integer references post("id")
)`
    const ast: Field[] = [
      {
        name: 'id',
        type: 'integer',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'user_id',
        type: 'integer',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: { table: 'user', field: 'id', type: '>-' },
      },
      {
        name: 'post_id',
        type: 'integer',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: { table: 'post', field: 'id', type: '>-' },
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse inline foreign key without field type', () => {
    const sql = /* sql */ `
create table test (
  user_id references user(id)
, post_id REFERENCES post("id")
)`
    const ast: Field[] = [
      {
        name: 'user_id',
        type: '',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: { table: 'user', field: 'id', type: '>-' },
      },
      {
        name: 'post_id',
        type: '',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: { table: 'post', field: 'id', type: '>-' },
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse separated foreign key', () => {
    const sql = /* sql */ `
CREATE TABLE test(
  user_id   INTEGER,
  "post_id" INTEGER,
  FOREIGN KEY("user_id") REFERENCES user(id),
  FOREIGN KEY(post_id) REFERENCES post("id")
)`
    const ast: Field[] = [
      {
        name: 'user_id',
        type: 'integer',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: { table: 'user', field: 'id', type: '>-' },
      },
      {
        name: 'post_id',
        type: 'integer',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: { table: 'post', field: 'id', type: '>-' },
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse unique column', () => {
    const sql = /* sql */ `
create table user (
  username text unique
, domain text
)`
    const ast: Field[] = [
      {
        name: 'username',
        type: 'text',
        is_primary_key: false,
        is_null: true,
        is_unique: true,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'domain',
        type: 'text',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse unique index', () => {
    const rows: SchemaRow[] = [
      {
        type: 'table',
        name: 'user',
        sql: /* sql */ `
CREATE TABLE \`user\` (
  \`id\` integer not null primary key autoincrement
, \`username\` text not null
, \`email\` text not null
)
`,
      },
      {
        type: 'index',
        name: '',
        sql: /* sql */ `
CREATE UNIQUE INDEX \`user_username_unique\` on \`user\` (\`username\`)
`,
      },
      {
        type: 'index',
        name: '',
        sql: /* sql */ `
CREATE UNIQUE INDEX "user_email_unique" on "user" (
  "email"
)
`,
      },
    ]
    const table_list: Table[] = [
      {
        name: 'user',
        field_list: [
          {
            name: 'id',
            type: 'integer',
            is_null: false,
            is_primary_key: true,
            is_unique: false,
            is_unsigned: false,
            default_value: undefined,
            references: undefined,
          },
          {
            name: 'username',
            type: 'text',
            is_null: false,
            is_primary_key: false,
            is_unique: true,
            is_unsigned: false,
            default_value: undefined,
            references: undefined,
          },
          {
            name: 'email',
            type: 'text',
            is_null: false,
            is_primary_key: false,
            is_unique: true,
            is_unsigned: false,
            default_value: undefined,
            references: undefined,
          },
        ],
      },
    ]
    expect(parseTableSchema(rows)).to.deep.equals(table_list)
  })

  it('should parse enum', () => {
    const rows: SchemaRow[] = [
      {
        type: 'table',
        name: 'thread',
        sql: /* sql */ `
CREATE TABLE \`thread\` (
  \`id\` integer not null primary key autoincrement
, \`status\` text check (\`status\` in ('active', 'pending')) not null
, "visibility" text NOT NULL CHECK ("visibility" IN ('Public', 'Private', 'Unlisted'))
, \`inclusion_in_main_study\` text null check(\`inclusion_in_main_study\` in ('yes','no'))
)
`,
      },
    ]
    const table_list: Table[] = [
      {
        name: 'thread',
        field_list: [
          {
            name: 'id',
            type: 'integer',
            is_null: false,
            is_primary_key: true,
            is_unique: false,
            is_unsigned: false,
            default_value: undefined,
            references: undefined,
          },
          {
            name: 'status',
            type: "enum('active','pending')",
            is_null: false,
            is_primary_key: false,
            is_unique: false,
            is_unsigned: false,
            default_value: undefined,
            references: undefined,
          },
          {
            name: 'visibility',
            type: "enum('Public','Private','Unlisted')",
            is_null: false,
            is_primary_key: false,
            is_unique: false,
            is_unsigned: false,
            default_value: undefined,
            references: undefined,
          },
          {
            name: 'inclusion_in_main_study',
            type: "enum('yes','no')",
            is_null: true,
            is_primary_key: false,
            is_unique: false,
            is_unsigned: false,
            default_value: undefined,
            references: undefined,
          },
        ],
      },
    ]
    expect(parseTableSchema(rows)).to.deep.equals(table_list)
  })

  it('should parse default value', () => {
    const rows: SchemaRow[] = [
      {
        type: 'table',
        name: 'user',
        sql: /* sql */ `
CREATE TABLE \`user\` (
  \`role\` text DEFAULT 'guest'
, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
, \`updated_at\` datetime default now() NOT NULL
)
`,
      },
    ]
    const table_list: Table[] = [
      {
        name: 'user',
        field_list: [
          {
            name: 'role',
            type: 'text',
            is_null: true,
            is_primary_key: false,
            is_unique: false,
            is_unsigned: false,
            default_value: `'guest'`,
            references: undefined,
          },
          {
            name: 'created_at',
            type: 'datetime',
            is_null: false,
            is_primary_key: false,
            is_unique: false,
            is_unsigned: false,
            default_value: `CURRENT_TIMESTAMP`,
            references: undefined,
          },
          {
            name: 'updated_at',
            type: 'datetime',
            is_null: false,
            is_primary_key: false,
            is_unique: false,
            is_unsigned: false,
            default_value: `now()`,
            references: undefined,
          },
        ],
      },
    ]
    expect(parseTableSchema(rows)).to.deep.equals(table_list)
  })

  it('should skip internal tables of fts5 extension', () => {
    let text = `
repo_fts,table,"CREATE VIRTUAL TABLE repo_fts using fts5(id,name,desc)"
repo_fts_data,table,"CREATE TABLE 'repo_fts_data'(id INTEGER PRIMARY KEY, block BLOB)"
repo_fts_idx,table,"CREATE TABLE 'repo_fts_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID"
repo_fts_content,table,"CREATE TABLE 'repo_fts_content'(id INTEGER PRIMARY KEY, c0, c1, c2)"
repo_fts_docsize,table,"CREATE TABLE 'repo_fts_docsize'(id INTEGER PRIMARY KEY, sz BLOB)"
repo_fts_config,table,"CREATE TABLE 'repo_fts_config'(k PRIMARY KEY, v) WITHOUT ROWID"
`
    let rows = text
      .trim()
      .split('\n')
      .map(line => {
        let parts = line.split(',')
        let name = parts[0]
        let type = parts[1]
        let sql = JSON.parse(line.slice(name.length + 1 + type.length + 1))
        return { name, type, sql }
      })
    let tables = parseTableSchema(rows)
    expect(tables).to.have.lengthOf(1)
    expect(tables[0].name).to.equals('repo_fts')
    expect(tables[0].is_virtual).to.be.true
    expect(tables[0].field_list).to.have.lengthOf(3)
    expect(tables[0].field_list[0].name).to.equals('id')
    expect(tables[0].field_list[1].name).to.equals('name')
    expect(tables[0].field_list[2].name).to.equals('desc')
  })
})
