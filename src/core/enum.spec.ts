import { expect } from 'chai'
import { formatEnum } from './enum'

describe('enum parser', () => {
  it('should parse values without quotes', () => {
    expect(formatEnum('enum(t,f)')).to.equal("enum('t','f')")
  })
  it('should parse values with quotes', () => {
    expect(formatEnum("enum('t','f')")).to.equal("enum('t','f')")
  })
  it('should remove spaces between commas', () => {
    expect(formatEnum('enum(t ,f)')).to.equal("enum('t','f')")
    expect(formatEnum('enum(t, f)')).to.equal("enum('t','f')")
    expect(formatEnum('enum(t , f)')).to.equal("enum('t','f')")

    expect(formatEnum("enum('t' ,'f')")).to.equal("enum('t','f')")
    expect(formatEnum("enum('t', 'f')")).to.equal("enum('t','f')")
    expect(formatEnum("enum('t' , 'f')")).to.equal("enum('t','f')")
  })
  it('should parse enum in upper case', () => {
    expect(formatEnum('ENUM(T,F)')).to.equal("ENUM('T','F')")
    expect(formatEnum('ENUM(t,f)')).to.equal("ENUM('t','f')")
  })
})
