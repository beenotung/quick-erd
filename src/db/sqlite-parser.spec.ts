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
})
