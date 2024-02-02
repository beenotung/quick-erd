import { expect } from 'chai'
import { findDir } from './text-to-spring'

describe('findDir', () => {
  it('should return when the dir is found', () => {
    const dir = findDir('src')
    expect(dir).to.equals('src')
  })

  it("should throw error if the dir doesn't exist", () => {
    expect(() => findDir('not-exist')).to.throws(
      /failed to locate the not-exist directory/,
    )
  })
})
