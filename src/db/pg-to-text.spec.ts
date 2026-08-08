import { expect } from 'chai'
import { parseEnum } from './pg-to-text'

describe('pg-to-text parseEnum', () => {
  it('should parse single-paren check clause from knex', () => {
    expect(
      parseEnum(
        'status',
        "(status = ANY (ARRAY['active'::text, 'recall'::text]))",
      ),
    ).to.equal("enum('active','recall')")
  })

  it('should parse double-paren check clause', () => {
    expect(
      parseEnum(
        'status',
        "((status = ANY (ARRAY['active'::text, 'recall'::text])))",
      ),
    ).to.equal("enum('active','recall')")
  })
})
