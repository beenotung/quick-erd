import { expect } from 'chai'
import { parse } from './ast'

describe('ast TestSuit', () => {
  it('should parse varchar', () => {
    let text = `
user
----
id pk
username varchar(32)
`
    let result = parse(text)
    expect(result).not.to.be.undefined
    expect(result.table_list).to.have.lengthOf(1)
    expect(result.table_list[0].field_list).to.have.lengthOf(2)
    expect(result.table_list[0].field_list[1].name).to.equals('username')
    expect(result.table_list[0].field_list[1].type).to.equals('varchar(32)')
  })
})
