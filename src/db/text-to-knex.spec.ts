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
})
