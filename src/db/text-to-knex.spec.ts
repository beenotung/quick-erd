import { expect } from 'chai'
import { textToKnex } from './text-to-knex'

describe('text-to-knex TestSuit', () => {
  context('varchar', () => {
    it('should convert varchar to string', () => {
      const text = `
user
----
username varchar(32)
`
      expect(textToKnex(text)).to.contains("table.string('username', 32)")
    })

    it('should support string column type as alias to varchar', () => {
      const text = `
user
----
username string(32)
`
      expect(textToKnex(text)).to.contains("table.string('username', 32)")
    })

    it('should support string column type without length', () => {
      const text = `
user
----
username string
`
      expect(textToKnex(text)).to.contains("table.string('username')")
    })
  })

  it('should support inline enum as column type', () => {
    const text = `
application
----
status enum('pending','approved','rejected')
`
    const code = textToKnex(text)
    expect(code).to.contains(
      "table.enum('status', ['pending', 'approved', 'rejected'])",
    )
  })

  it('should support integer with specified length', () => {
    const text = `
rating
------
user_id int(10) unsigned FK >- user.id
level int(11) null
`
    const code = textToKnex(text)
    expect(code).to.contains(
      `table.integer('user_id', 10).unsigned().notNullable().references('user.id')`,
    )
    expect(code).to.contains(`table.integer('level', 11).nullable()`)
  })

  it('should support unique column', () => {
    const text = `
user
----
username text unique
domain text
`
    const code = textToKnex(text)
    expect(code).to.contains(`table.text('username').notNullable()`)
    expect(code).to.contains(`table.text('domain').notNullable()`)
    expect(code).to.contains(`table.text('username').notNullable().unique()`)
    expect(code).not.to.contains(`table.text('domain').notNullable().unique()`)
  })
})
