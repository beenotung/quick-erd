import { expect } from 'chai'
import { parseColumns, parseParts } from './query-input'
import { Column } from '../core/query'

describe('query-input parser TestSuit', () => {
  const query_text = `
product.id
product.name
order.id
order.product_id
shipment.id
shipment.courier_id
user.username
`
  const query_columns: Column[] = [
    { table: 'product', field: 'id' },
    { table: 'product', field: 'name' },
    { table: 'order', field: 'id' },
    { table: 'order', field: 'product_id' },
    { table: 'shipment', field: 'id' },
    { table: 'shipment', field: 'courier_id' },
    { table: 'user', field: 'username' },
  ]
  it('should parse query columns', () => {
    const parts = parseParts(query_text)
    const columns = parseColumns(parts[0])
    expect(columns).to.deep.equals(query_columns)
  })
})
