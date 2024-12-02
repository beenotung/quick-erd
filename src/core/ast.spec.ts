import { expect } from 'chai'
import { parse } from './ast'
import { expectObjectKeys } from '../../test/utils'

describe('ast TestSuit', () => {
  function parseSingleTable(text: string) {
    const result = parse(text)
    expect(result).not.to.be.undefined
    expect(result.table_list).to.have.lengthOf(1)
    return result.table_list[0]
  }

  it('should parse varchar', () => {
    const text = `
user
----
id pk
username varchar(32)
`
    const table = parseSingleTable(text)
    const field_list = table.field_list
    expect(field_list).to.have.lengthOf(2)
    expect(field_list[1].name).to.equals('username')
    expect(field_list[1].type).to.equals('varchar(32)')
  })

  it('should parse nvarchar', () => {
    const text = `
post
----
id pk
topic nvarchar(50)
`
    const table = parseSingleTable(text)
    const field_list = table.field_list
    expect(field_list).to.have.lengthOf(2)
    expect(field_list[1].name).to.equals('topic')
    expect(field_list[1].type).to.equals('nvarchar(50)')
  })

  it('should parse char', () => {
    const text = `
user
----
id pk
username char(32)
`
    const table = parseSingleTable(text)
    const field_list = table.field_list
    expect(field_list).to.have.lengthOf(2)
    expect(field_list[1].name).to.equals('username')
    expect(field_list[1].type).to.equals('char(32)')
  })

  it('should parse datetime', () => {
    const text = `
user
----
created_at datetime
`
    const table = parseSingleTable(text)
    const field_list = table.field_list
    expect(field_list).to.have.lengthOf(1)

    expect(field_list[0].name).to.equals('created_at')
    expect(field_list[0].type).to.equals('datetime')
  })

  it('should parse unsigned type', () => {
    const text = `
user
----
id int(10) unsigned PK
level int(10)
score int(10) unsigned
`
    const result = parse(text)
    expect(result).not.to.be.undefined
    expect(result.table_list).to.have.lengthOf(1)
    const field_list = result.table_list[0].field_list
    expect(field_list).to.have.lengthOf(3)

    expect(field_list[0].name).to.equals('id')
    expect(field_list[0].type).to.equals('int(10)')
    expect(field_list[0].is_unsigned).to.be.true
    expect(field_list[0].is_primary_key).to.be.true

    expect(field_list[1].name).to.equals('level')
    expect(field_list[1].type).to.equals('int(10)')
    expect(field_list[1].is_unsigned).to.be.false

    expect(field_list[2].name).to.equals('score')
    expect(field_list[2].type).to.equals('int(10)')
    expect(field_list[2].is_unsigned).to.be.true
  })

  describe('auto detect primary key', () => {
    it('should treat id as primary key if no other field is marked as primary key', () => {
      const text = `
user
----
id
username text
`
      const table = parseSingleTable(text)
      const field_list = table.field_list
      expect(field_list).to.have.lengthOf(2)

      expect(field_list[0].name).to.equals('id')
      expect(field_list[0].is_primary_key).to.be.true

      expect(field_list[1].name).to.equals('username')
      expect(field_list[1].is_primary_key).to.be.false
    })
    it('should not tread id as primary key if primary key is already marked', () => {
      const text = `
user
----
id
user_id pk
username text
`
      const result = parse(text)
      expect(result).not.to.be.undefined
      expect(result.table_list).to.have.lengthOf(1)
      const field_list = result.table_list[0].field_list
      expect(field_list).to.have.lengthOf(3)

      expect(field_list[0].name).to.equals('id')
      expect(field_list[0].is_primary_key).to.be.false

      expect(field_list[1].name).to.equals('user_id')
      expect(field_list[1].is_primary_key).to.be.true

      expect(field_list[2].name).to.equals('username')
      expect(field_list[2].is_primary_key).to.be.false
    })
  })

  it('should parse unique field', () => {
    const text = `
user
----
username text unique
domain text
`
    const table = parseSingleTable(text)
    const { field_list } = table
    expect(field_list).to.have.lengthOf(2)

    expect(field_list[0].name).to.equals('username')
    expect(field_list[0].type).to.equals('text')
    expect(field_list[0].is_unique).to.be.true

    expect(field_list[1].name).to.equals('domain')
    expect(field_list[1].type).to.equals('text')
    expect(field_list[1].is_unique).to.be.false
  })

  describe('foreign key reference', () => {
    it('should parse explicit reference with table and field', () => {
      const text = `
post
----
user_id fk >0- user.id
`
      const table = parseSingleTable(text)
      const { field_list } = table

      expect(field_list[0].name).to.equals('user_id')
      expect(field_list[0].references).not.undefined
      expect(field_list[0].references!.table).to.equals('user')
      expect(field_list[0].references!.field).to.equals('id')
      expect(field_list[0].references!.type).to.equals('>0-')
    })

    it('should parse explicit reference without stating primary key', () => {
      const text = `
post
----
author_id fk >0- user
`
      const table = parseSingleTable(text)
      const { field_list } = table

      expect(field_list[0].name).to.equals('author_id')
      expect(field_list[0].references).not.undefined
      expect(field_list[0].references!.table).to.equals('user')
      expect(field_list[0].references!.field).to.equals('id')
      expect(field_list[0].references!.type).to.equals('>0-')
    })

    it('should parse explicit reference without table name nor field', () => {
      const text = `
post
----
user_id fk
`
      const table = parseSingleTable(text)
      const { field_list } = table

      expect(field_list[0].name).to.equals('user_id')
      expect(field_list[0].references).not.undefined
      expect(field_list[0].references!.table).to.equals('user')
      expect(field_list[0].references!.field).to.equals('id')
      expect(field_list[0].references!.type).to.equals('>0-')
    })
  })

  describe('enum column type', () => {
    it('should parse enum with wrapping single quote', () => {
      const text = `
acl
---
permission enum('create','read','update','delete')
`
      const table = parseSingleTable(text)
      const { field_list } = table
      expect(field_list).to.have.lengthOf(1)

      expect(field_list[0].name).to.equals('permission')
      expect(field_list[0].type).to.equals(
        "enum('create','read','update','delete')",
      )
    })

    it('should parse enum without wrapping single quote', () => {
      const text = `
acl
---
permission enum(create,read,update,delete)
`
      const table = parseSingleTable(text)
      const { field_list } = table
      expect(field_list).to.have.lengthOf(1)

      expect(field_list[0].name).to.equals('permission')
      expect(field_list[0].type).to.equals(
        "enum('create','read','update','delete')",
      )
    })

    it('should parse enum with spaces between commas', () => {
      const text = `
acl
---
role text
permission enum(create, read, update, delete)
something_after text
`
      const table = parseSingleTable(text)
      const { field_list } = table
      expect(field_list).to.have.lengthOf(3)

      expect(field_list[0].name).to.equals('role')
      expect(field_list[0].type).to.equals('text')

      expect(field_list[1].name).to.equals('permission')
      expect(field_list[1].type).to.equals(
        "enum('create','read','update','delete')",
      )

      expect(field_list[2].name).to.equals('something_after')
      expect(field_list[2].type).to.equals('text')
    })

    it('should preserve spaces in enum values with wrapping single quote', () => {
      const text = `
clothes
-------
id
size enum('small size','large size','XL size')
name text
`
      const table = parseSingleTable(text)
      const { field_list } = table
      expect(field_list).to.have.lengthOf(3)

      expect(field_list[0].name).to.equals('id')

      expect(field_list[1].name).to.equals('size')
      expect(field_list[1].type).to.equals(
        "enum('small size','large size','XL size')",
      )

      expect(field_list[2].name).to.equals('name')
      expect(field_list[2].type).to.equals('text')
    })

    it('should preserve spaces in enum values without wrapping single quote', () => {
      const text = `
clothes
-------
id
size Enum(small size,large size,XL size)
name text
`
      const table = parseSingleTable(text)
      const { field_list } = table
      expect(field_list).to.have.lengthOf(3)

      expect(field_list[0].name).to.equals('id')

      expect(field_list[1].name).to.equals('size')
      expect(field_list[1].type).to.equals(
        "Enum('small size','large size','XL size')",
      )

      expect(field_list[2].name).to.equals('name')
      expect(field_list[2].type).to.equals('text')
    })
  })

  describe('parsing position data', () => {
    const text = `
user
----
id pk
username text

room
----
id pk
name text

# zoom: 0.890
# view: (94, 292)
# user (821, 369, #ff0000)
# room (65, 708)
`
    const ast = parse(text)

    expectObjectKeys(ast, ['zoom', 'view'])
    expect(ast.zoom).to.equals(0.89)
    expect(ast.view).to.deep.equals({ x: 94, y: 292 })

    expect(ast.table_list).to.have.lengthOf(2)

    expectObjectKeys(ast.table_list[0], ['name', 'position'])
    expect(ast.table_list[0].name).to.equals('user')
    expect(ast.table_list[0].position).to.deep.equals({
      x: 821,
      y: 369,
      color: '#ff0000',
    })

    expectObjectKeys(ast.table_list[1], ['name', 'position'])
    expect(ast.table_list[1].name).to.equals('room')
    expect(ast.table_list[1].position).to.deep.equals({
      x: 65,
      y: 708,
      color: undefined,
    })
  })

  it('should not treat not null as column type', () => {
    const text = `
user
----
id
username text not null
`
    const table = parseSingleTable(text)
    const { field_list } = table
    expect(field_list).to.have.lengthOf(2)

    expect(field_list[0].name).to.equals('id')

    expect(field_list[1].name).to.equals('username')
    expect(field_list[1].type).to.equals('text')
    expect(field_list[1].is_null).to.be.false
  })

  it('should parse default value', () => {
    const text = `
user
----
id
role text default 'guest'
score real default 0
created_at datetime DEFAULT CURRENT_TIMESTAMP
updated_at datetime default now()
`

    const table = parseSingleTable(text)
    const { field_list } = table
    expect(field_list).to.have.lengthOf(5)

    expect(field_list[0].name).to.equals('id')
    expect(field_list[0].default_value).to.be.undefined

    expect(field_list[1].name).to.equals('role')
    expect(field_list[1].type).to.equals('text')
    expect(field_list[1].default_value).to.equals("'guest'")

    expect(field_list[2].name).to.equals('score')
    expect(field_list[2].type).to.equals('real')
    expect(field_list[2].default_value).to.equals('0')

    expect(field_list[3].name).to.equals('created_at')
    expect(field_list[3].type).to.equals('datetime')
    expect(field_list[3].default_value).to.equals('CURRENT_TIMESTAMP')

    expect(field_list[4].name).to.equals('updated_at')
    expect(field_list[4].type).to.equals('datetime')
    expect(field_list[4].default_value).to.equals('now()')
  })
})
