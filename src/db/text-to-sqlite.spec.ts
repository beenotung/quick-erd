import { expect } from 'chai'
import { textToSqlite } from './text-to-sqlite'

describe('text-to-sqlite TestSuit', () => {
  it('should convert varchar to text', () => {
    const text = `
user
----
username varchar(32)
`
    expect(textToSqlite(text).up).to.contains('username text not null')
  })

  it('should support inline enum as column type', () => {
    const text = `
application
----
status enum('pending','approved','rejected')
`
    expect(textToSqlite(text).up).to.contains(
      "status text not null check(status in ('pending','approved','rejected'))",
    )
  })
})
