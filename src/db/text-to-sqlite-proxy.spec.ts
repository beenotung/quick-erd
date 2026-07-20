import { expect } from 'chai'
import { textToSqliteProxy } from './text-to-sqlite-proxy'

describe('text-to-sqlite-proxy TestSuit', () => {
  it('should generate relation fields according to foreign key', () => {
    const text = `
content
-
id pk
user_id fk >0- user.id
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

  it('should follow the order of table definition', () => {
    const text = `
post
----
id pk
user_id fk >0- user.id
title text

user
----
id pk
username text
`
    const code = textToSqliteProxy(text)

    const type_post_index = code.indexOf('type Post')
    const type_user_index = code.indexOf('type User')
    expect(type_post_index).not.to.equals(-1)
    expect(type_user_index).not.to.equals(-1)
    expect(type_post_index).to.be.lessThan(type_user_index)

    const schema_post_index = code.indexOf('post: [')
    const schema_user_index = code.indexOf('user: [')
    expect(schema_post_index).not.to.equals(-1)
    expect(schema_user_index).not.to.equals(-1)
    expect(schema_post_index).to.be.lessThan(schema_user_index)
  })
})
