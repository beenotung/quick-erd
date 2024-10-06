import { expect } from 'chai'
import { textToKnex as textToKnex_ } from './text-to-knex'

function textToKnex(text: string, db_client = 'mysql') {
  return textToKnex_(text, db_client)
}

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

  context('nvarchar', () => {
    it('should convert nvarchar to string', () => {
      const text = `
user
----
username nvarchar(32)
`
      expect(textToKnex(text)).to.contains("table.string('username', 32)")
    })

    it('should support string column type as alias to nvarchar when using mssql', () => {
      const text = `
user
----
username string(32)
`
      expect(textToKnex(text, 'mssql')).to.contains(
        "table.string('username', 32)",
      )
    })
  })

  it('should convert char to specificType', () => {
    const text = `
user
----
password_hash char(60)
`
    expect(textToKnex(text)).to.contains(
      "table.specificType('password_hash', 'char(60)')",
    )
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

  it("should translate 'blob' sqlite field to knex 'binary' column", () => {
    const text = `
content
-------
payload blob
`
    const code = textToKnex(text)
    expect(code).to.contains(`table.binary('payload').notNullable()`)
  })

  it("should translate 'int' field type to knex 'integer' column", () => {
    const text = `
content
-------
size int
`
    const code = textToKnex(text)
    expect(code).to.contains(`table.integer('size').notNullable()`)
  })

  it("should preserve 'real' field type", () => {
    const text = `
point
-------
x real
y real
`
    const code = textToKnex(text)
    expect(code).to.contains(`table.specificType('x', 'real').notNullable()`)
    expect(code).to.contains(`table.specificType('y', 'real').notNullable()`)
  })

  it("should support 'char' field type", () => {
    const text = `
user
----
password_hash char(60)
`
    const code = textToKnex(text)
    expect(code).to.contains(
      `table.specificType('password_hash', 'char(60)').notNullable()`,
    )
  })

  it('should convert field type to lower case', () => {
    const text = `
user
----
is_admin Boolean
is_staff BOOLEAN
`
    expect(textToKnex(text)).to.contains("table.boolean('is_admin')")
    expect(textToKnex(text)).to.contains("table.boolean('is_staff')")
  })

  it("should translate 'bool' field type to knex 'boolean' column", () => {
    const text = `
user
----
is_admin bool
is_staff BOOL
`
    const code = textToKnex(text)
    expect(code).to.contains(`table.boolean('is_admin')`)
    expect(code).to.contains(`table.boolean('is_staff')`)
  })

  it('should support default value', () => {
    const text = `
user
----
role text default 'guest'
`

    expect(textToKnex(text)).to.contains(
      "table.text('role').notNullable().defaultTo('guest')",
    )
  })
})
