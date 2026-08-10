import { expect } from 'chai'
import { parse } from './ast'
import { astToText, tableToString } from './table'

let formattedText: string

before(() => {
  const text = `
post
-
id
user_id fk

# zoom: 0.895
# view: (12, 34)
# post (56, 78)
`
  const ast = parse(text)
  formattedText = astToText(ast)
})

it('should adjust the length of line below table name according length of table name', () => {
  expect(formattedText).contain('post\n----\n')
})

it('should default column type of integer', () => {
  expect(formattedText).contain('id integer')
})

it('should default id column to be primary key', () => {
  const line = formattedText.split('\n').find(line => line.startsWith('id '))
  expect(line).contain(' PK')
})

it('should auto fill reference table and column to fk column according to the column name', () => {
  const line = formattedText
    .split('\n')
    .find(line => line.startsWith('user_id '))
  expect(line).contain('FK >0- user.id')
})

it('should preserve zoom line', () => {
  expect(formattedText).contain('# zoom: 0.895')
})

it('should preserve view position line', () => {
  expect(formattedText).contain('# view: (12, 34)')
})

it('should preserve table position line', () => {
  expect(formattedText).contain('# post (56, 78)')
})

it('should render composite unique and index keys', () => {
  const ast = parse(`
like
-
id
user_id
post_id
unique(user_id,post_id)
index(user_id,post_id)
`)
  const text = tableToString(ast.table_list[0])
  expect(text).contain('unique(user_id,post_id)')
  expect(text).contain('index(user_id,post_id)')
})
