import { expect } from 'chai'
import { textToSqliteProxy } from './text-to-sqlite-proxy'

describe('text-to-sqlite-proxy TestSuit', () => {
  it('should generate relation fields according to foreign key', () => {
    const text = `
content
-
id pk
user_id fk >- user.id
title text
`
    const code = textToSqliteProxy(text)
    expect(code).to.contains(`['user', { field: 'user_id', table: 'user' }]`)
  })
})
