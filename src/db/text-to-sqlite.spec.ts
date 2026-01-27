import { expect } from 'chai'
import { textToSqlite } from './text-to-sqlite'

describe('text-to-sqlite TestSuit', () => {
  it('should preserve varchar', () => {
    const text = `
user
----
username varchar(32)
`
    expect(textToSqlite(text).up).to.contains('`username` varchar(32) not null')
  })

  it('should support inline enum as column type', () => {
    const text = `
application
----
status enum('pending','approved','rejected')
`
    expect(textToSqlite(text).up).to.contains(
      "`status` text not null check(`status` in ('pending','approved','rejected'))",
    )
  })

  it('should support unique column', () => {
    const text = `
user
----
username text unique
domain text
`
    const up = textToSqlite(text).up
    expect(up).to.contains('`username` text not null')
    expect(up).to.contains('`domain` text not null')
    expect(up).to.contains('`username` text not null unique')
    expect(up).not.to.contains('`domain` text not null unique')
  })

  it('should support blob column', () => {
    const text = `
content
----
payload blob
`
    const up = textToSqlite(text).up
    expect(up).to.contains('`payload` blob not null')
  })

  it('should support default value', () => {
    const text = `
user
----
score default 0
role text default "guest"
`
    const up = textToSqlite(text).up
    expect(up).to.contains('`score` integer not null default 0')
    expect(up).to.contains('`role` text not null default "guest"')
  })
})
