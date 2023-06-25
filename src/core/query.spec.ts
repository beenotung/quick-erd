import { expect } from 'chai'
import { parseColumns, parseParts } from '../client/query-input'
import { parse } from './ast'
import { generateQuery } from './query-2'

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
  name: string
  product_id: number
  order_id: number
  courier_id: number
  username: string
}
`.trim(),
    )
    expect(query.sql.trim()).to.equals(
      /* sql */ `
select
  product.name
, order.product_id
, shipment.order_id
, shipment.courier_id
, courier.username
from product
inner join order on order.product_id = product.id
inner join shipment on shipment.order_id = order.id
inner join user as courier on courier.id = shipment.courier_id
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
  id: number
  product_name: string
  category_id: number
  category_name: string
}
`.trim(),
    )
    expect(query.sql.trim()).to.equals(
      /* sql */ `
select
  product.id
, product.name as product_name
, product.category_id
, category.name as category_name
from product
inner join category on category.id = product.category_id
`.trim(),
    )
  })

  it.skip('should the table field multiple times when joined by multiple foreign keys', () => {
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
    expect(query.sql.trim()).to.equals(
      /* sql */ `
select
  post.id
, post.author_id
, post.editor_id
, author.username as author_username
, editor.username as editor_username
from product
inner join user as author on author.id = post.author_id
inner join user as editor on editor.id = post.editor_id
`.trim(),
    )
  })
})
