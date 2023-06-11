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

  it('should use reference table name as virtual field name if referring from primary key', () => {
    const text = `
profile
-
id pk fk - user.id
nickname text
`
    const code = textToSqliteProxy(text)
    expect(code).to.contains(`['user', { field: 'id', table: 'user' }]`)
  })

  it('should indicate default value as inline comment', () => {
    const text = `
user
-
score default 0
role text default 'guest'
`

    const code = textToSqliteProxy(text)
    expect(code).to.contains(`score: number // default: 0`)
    expect(code).to.contains(`role: string // default: 'guest'`)
  })
})
