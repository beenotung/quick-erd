import { expect } from 'chai'
import { Field } from '../core/ast'
import { parseCreateTable } from './mysql-parser'

describe('mysql-parser TestSuit', () => {
  const sql = `
CREATE TABLE \`user\` (
  \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`username\` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`created_at\` datetime NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`

  let fields: Field[]
  before(() => {
    fields = parseCreateTable(sql)
  })

  it('should parse primary key', () => {
    const field: Field = {
      name: 'id',
      type: 'int(10)',
      is_primary_key: true,
      is_null: false,
      is_unsigned: true,
      references: undefined,
    }
    expect(fields).deep.contains(field)
  })

  it('should parse varchar', () => {
    expect(fields).deep.contains({
      name: 'username',
      type: 'varchar(64)',
      is_primary_key: false,
      is_null: false,
      is_unsigned: false,
      references: undefined,
    })
  })

  it('should parse datetime', () => {
    expect(fields).deep.contains({
      name: 'created_at',
      type: 'datetime',
      is_primary_key: false,
      is_null: false,
      is_unsigned: false,
      references: undefined,
    })
    expect(fields).deep.contains({
      name: 'updated_at',
      type: 'datetime',
      is_primary_key: false,
      is_null: false,
      is_unsigned: false,
      references: undefined,
    })
  })
})
