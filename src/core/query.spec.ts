import { expect } from 'chai'
import { parseColumns, parseParts } from '../client/query-input'
import { parse } from './ast'
import { generateQuery } from './query'

describe('query builder TestSuit', () => {
  it('should join tables according to selected columns', () => {
    const schema_text = `
user
----
id
username text

product
-------
id
owner_id fk >0- user
name text

order
-----
id
product_id fk

shipment
-------
id
order_id fk
courier_id fk >0- user
`.trim()
    const query_text = `
product.name
order.product_id
shipment.order_id
shipment.courier_id
user.username
`.trim()
    const table_list = parse(schema_text).table_list
    const columns = parseColumns(parseParts(query_text)[0])
    const query = generateQuery(columns, table_list)
    expect(query.tsType.trim()).to.equals(
      `
export type Row = {
  order_id: number
  courier_id: number
  product_id: number
  courier_username: string
  product_name: string
}
`.trim(),
    )
    expect(query.sql.trim()).to.equals(
      /* sql */ `
select
  shipment.order_id
, shipment.courier_id
, order.product_id
, courier.username as courier_username
, product.name as product_name
from shipment
inner join order on order.id = shipment.order_id
inner join user as courier on courier.id = shipment.courier_id
inner join product on product.id = order.product_id
`.trim(),
    )
    expect(query.knex.trim()).to.equals(
      `
knex
  .from('shipment')
  .innerJoin('order', 'order.id', 'shipment.order_id')
  .innerJoin('user as courier', 'courier.id', 'shipment.courier_id')
  .innerJoin('product', 'product.id', 'order.product_id')
  .select(
    'shipment.order_id',
    'shipment.courier_id',
    'order.product_id',
    'courier.username as courier_username',
    'product.name as product_name',
  )
`.trim(),
    )
  })

  it('should alias column name when duplicated', () => {
    const schema_text = `
product
-------
id
name text
category_id fk

category
--------
id
name text
`.trim()
    const query_text = `
product.id
product.name
product.category_id
category.name
`.trim()
    const table_list = parse(schema_text).table_list
    const columns = parseColumns(parseParts(query_text)[0])
    const query = generateQuery(columns, table_list)
    expect(query.tsType.trim()).to.equals(
      `
export type Row = {
  product_id: number
  product_name: string
  category_id: number
  category_name: string
}
`.trim(),
    )
    expect(query.sql.trim()).to.equals(
      /* sql */ `
select
  product.id as product_id
, product.name as product_name
, product.category_id
, category.name as category_name
from product
inner join category on category.id = product.category_id
`.trim(),
    )
    expect(query.knex.trim()).to.equals(
      `
knex
  .from('product')
  .innerJoin('category', 'category.id', 'product.category_id')
  .select(
    'product.id as product_id',
    'product.name as product_name',
    'product.category_id',
    'category.name as category_name',
  )
`.trim(),
    )
  })

  it('should select the table field multiple times with alias when joined by multiple foreign keys', () => {
    const schema_text = `
post
----
id
author_id fk user >- user
editor_id fk user >- user

user
----
id
username text
`.trim()
    const query_text = `
post.id
post.author_id
post.editor_id
user.username
`.trim()
    const table_list = parse(schema_text).table_list
    const columns = parseColumns(parseParts(query_text)[0])
    const query = generateQuery(columns, table_list)
    expect(query.tsType.trim()).to.equals(
      `
export type Row = {
  post_id: number
  author_id: number
  editor_id: number
  author_username: string
  editor_username: string
}
`.trim(),
    )
    expect(query.sql.trim()).to.equals(
      /* sql */ `
select
  post.id as post_id
, post.author_id
, post.editor_id
, author.username as author_username
, editor.username as editor_username
from post
inner join user as author on author.id = post.author_id
inner join user as editor on editor.id = post.editor_id
`.trim(),
    )
    expect(query.knex.trim()).to.equals(
      `
knex
  .from('post')
  .innerJoin('user as author', 'author.id', 'post.author_id')
  .innerJoin('user as editor', 'editor.id', 'post.editor_id')
  .select(
    'post.id as post_id',
    'post.author_id',
    'post.editor_id',
    'author.username as author_username',
    'editor.username as editor_username',
  )
`.trim(),
    )
  })
})
