import { expect } from 'chai'
import { parse } from './ast'

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
})
