import { expect } from 'chai'
import { parse } from './ast'

describe('ast TestSuit', () => {
  it('should parse varchar', () => {
    const text = `
user
----
id pk
username varchar(32)
`
    const result = parse(text)
    expect(result).not.to.be.undefined
    expect(result.table_list).to.have.lengthOf(1)
    expect(result.table_list[0].field_list).to.have.lengthOf(2)
    expect(result.table_list[0].field_list[1].name).to.equals('username')
    expect(result.table_list[0].field_list[1].type).to.equals('varchar(32)')
  })

  describe('auto detect primary key', () => {
    it('should treat id as primary key if no other field is marked as primary key', () => {
      const text = `
user
----
id
username text
`
      const result = parse(text)
      expect(result).not.to.be.undefined
      expect(result.table_list).to.have.lengthOf(1)
      const field_list = result.table_list[0].field_list
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
})
