import { expect } from 'chai'
import { snake_to_camel, snake_to_Pascal } from './case'

it('should convert to PascalCase', () => {
  expect(snake_to_Pascal('user_pet')).to.equals('UserPet')
})

it('should convert to camelCase', () => {
  expect(snake_to_camel('user_pet')).to.equals('userPet')
})
