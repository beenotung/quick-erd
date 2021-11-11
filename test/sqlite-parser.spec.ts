import { Field } from './../src/client/ast'
import { expect } from 'chai'
import { parseCreateTable } from '../src/client/sqlite-parser'

describe('sqlite-parser TestSuit', () => {
  it('should parse plain columns', () => {
    let sql = /* sql */ `
create table test (
  id integer
, "content" text
)`
    let ast: Field[] = [
      {
        name: 'id',
        type: 'integer',
        is_primary_key: false,
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
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse inline primary key', () => {
    let sql = /* sql */ `
create table test (
  id integer primary key
, content text
)`
    let ast: Field[] = [
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
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })

  it('should parse inline primary key without type', () => {
    let sql = /* sql */ `
create table test (
  id primary key
, content text
)`
    let ast: Field[] = [
      {
        name: 'id',
        type: '',
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
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse separated primary key', () => {
    let sql = /* sql */ `
create table test (
  id integer
, content text
, primary key("id")
)`
    let ast: Field[] = [
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
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse inline foreign key', () => {
    let sql = /* sql */ `
create table test (
  id integer
, user_id integer references user(id)
, post_id integer references post("id")
)`
    let ast: Field[] = [
      {
        name: 'id',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        references: undefined,
      },
      {
        name: 'user_id',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        references: { table: 'user', field: 'id', type: '>-' },
      },
      {
        name: 'post_id',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        references: { table: 'post', field: 'id', type: '>-' },
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse inline foreign key without field type', () => {
    let sql = /* sql */ `
create table test (
  user_id references user(id)
, post_id REFERENCES post("id")
)`
    let ast: Field[] = [
      {
        name: 'user_id',
        type: '',
        is_primary_key: false,
        is_null: false,
        references: { table: 'user', field: 'id', type: '>-' },
      },
      {
        name: 'post_id',
        type: '',
        is_primary_key: false,
        is_null: false,
        references: { table: 'post', field: 'id', type: '>-' },
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
  it('should parse separated foreign key', () => {
    let sql = /* sql */ `
CREATE TABLE test(
  user_id   INTEGER,
  "post_id" INTEGER,
  FOREIGN KEY("user_id") REFERENCES user(id),
  FOREIGN KEY(post_id) REFERENCES post("id")
)`
    let ast: Field[] = [
      {
        name: 'user_id',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        references: { table: 'user', field: 'id', type: '>-' },
      },
      {
        name: 'post_id',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        references: { table: 'post', field: 'id', type: '>-' },
      },
    ]
    expect(parseCreateTable(sql)).to.deep.equals(ast)
  })
})
