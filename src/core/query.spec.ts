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
})
