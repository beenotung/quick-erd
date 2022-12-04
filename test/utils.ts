import { expect } from 'chai'

export function expectObjectKeys(object: object, keys: string[]) {
  expect(object).not.undefined
  let realKeys = Object.keys(object)
  for (let key of keys) {
    expect(realKeys).to.contains(key)
  }
}
