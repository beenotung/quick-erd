import { expect } from 'chai'
import { Field } from '../core/ast'
import { parseCreateTable } from './mysql-parser'

describe('mysql-parser TestSuit', () => {
  const sql = `
CREATE TABLE \`user\` (
  \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`username\` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`domain\` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`created_at\` datetime NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` datetime DEFAULT current_timestamp() NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`username\` (\`username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`

  let fields: Field[]
  before(() => {
    fields = parseCreateTable(sql).field_list
  })

  it('should parse primary key', () => {
    const field: Field = {
      name: 'id',
      type: 'int(10)',
      is_primary_key: true,
      is_null: false,
      is_unique: false,
      is_index: false,
      is_unsigned: true,
      is_zerofill: false,
      default_value: undefined,
      references: undefined,
      collate: undefined,
    }
    expect(fields).deep.contains(field)
  })

  it('should parse varchar', () => {
    const field: Field = {
      name: 'domain',
      type: 'varchar(32)',
      is_primary_key: false,
      is_null: false,
      is_unique: false,
      is_index: false,
      is_unsigned: false,
      is_zerofill: false,
      default_value: undefined,
      references: undefined,
      collate: 'utf8mb4_unicode_ci',
    }
    expect(fields).deep.contains(field)
  })

  it('should parse unique column', () => {
    const field: Field = {
      name: 'username',
      type: 'varchar(64)',
      is_primary_key: false,
      is_null: false,
      is_unique: true,
      is_index: false,
      is_unsigned: false,
      is_zerofill: false,
      default_value: undefined,
      references: undefined,
      collate: 'utf8mb4_unicode_ci',
    }
    expect(fields).deep.contains(field)
  })

  it('should parse datetime with default value', () => {
    let field: Field = {
      name: 'created_at',
      type: 'datetime',
      is_primary_key: false,
      is_null: false,
      is_unique: false,
      is_index: false,
      is_unsigned: false,
      is_zerofill: false,
      default_value: 'current_timestamp()',
      references: undefined,
      collate: undefined,
    }
    expect(fields).deep.contains(field)
    field = {
      name: 'updated_at',
      type: 'datetime',
      is_primary_key: false,
      is_null: false,
      is_unique: false,
      is_index: false,
      is_unsigned: false,
      is_zerofill: false,
      default_value: 'current_timestamp()',
      references: undefined,
      collate: undefined,
    }
    expect(fields).deep.contains(field)
  })
})

describe('mysql-parser index TestSuit', () => {
  it('should parse INDEX key', () => {
    let sql = `
CREATE TABLE \`post\` (
  \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`user_id\` int(10) unsigned NOT NULL,
  \`status\` varchar(32) NOT NULL,
  PRIMARY KEY (\`id\`),
  INDEX \`post_user_id\` (\`user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`
    let fields = parseCreateTable(sql).field_list
    let user_id = fields.find(field => field.name === 'user_id')
    expect(user_id).not.to.be.undefined
    expect(user_id!.is_index).to.be.true
    let status = fields.find(field => field.name === 'status')
    expect(status!.is_index).to.be.false
  })

  it('should parse KEY syntax (as emitted by SHOW CREATE TABLE)', () => {
    let sql = `
CREATE TABLE \`post\` (
  \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`user_id\` int(10) unsigned NOT NULL,
  \`status\` varchar(32) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`post_user_status\` (\`user_id\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`
    const { index_field_lists } = parseCreateTable(sql)
    expect(index_field_lists).to.have.lengthOf(1)
    expect(index_field_lists[0]).to.deep.equal(['user_id', 'status'])
  })
})

describe('mysql-parser multi-column key TestSuit', () => {
  it('should parse composite unique key', () => {
    const sql = `
CREATE TABLE \`post_keyword\` (
  \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`post_id\` int(10) unsigned NOT NULL,
  \`keyword_id\` int(10) unsigned NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`post_keyword_unique\` (\`post_id\`, \`keyword_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`
    const { unique_field_lists } = parseCreateTable(sql)
    expect(unique_field_lists).to.have.lengthOf(1)
    expect(unique_field_lists[0]).to.deep.equal(['post_id', 'keyword_id'])
  })

  it('should parse composite index key', () => {
    const sql = `
CREATE TABLE \`post\` (
  \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`user_id\` int(10) unsigned NOT NULL,
  \`status\` varchar(32) NOT NULL,
  PRIMARY KEY (\`id\`),
  INDEX \`post_user_status\` (\`user_id\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`
    const { index_field_lists } = parseCreateTable(sql)
    expect(index_field_lists).to.have.lengthOf(1)
    expect(index_field_lists[0]).to.deep.equal(['user_id', 'status'])
  })

  it('should not flag fields of composite unique key as individually unique', () => {
    const sql = `
CREATE TABLE \`post_keyword\` (
  \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`post_id\` int(10) unsigned NOT NULL,
  \`keyword_id\` int(10) unsigned NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`post_keyword_unique\` (\`post_id\`, \`keyword_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`
    const field_list = parseCreateTable(sql).field_list
    const post_id = field_list.find(field => field.name === 'post_id')
    const keyword_id = field_list.find(field => field.name === 'keyword_id')
    expect(post_id!.is_unique).to.be.false
    expect(keyword_id!.is_unique).to.be.false
  })

  it('should exclude single-column keys from the composite lists', () => {
    const sql = `
CREATE TABLE \`user\` (
  \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`email\` varchar(64) NOT NULL,
  \`status\` varchar(32) NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_email\` (\`email\`),
  INDEX \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`
    const { field_list, unique_field_lists, index_field_lists } =
      parseCreateTable(sql)
    const email = field_list.find(field => field.name === 'email')
    const status = field_list.find(field => field.name === 'status')
    expect(email!.is_unique).to.be.true
    expect(status!.is_index).to.be.true
    expect(unique_field_lists).to.have.lengthOf(0)
    expect(index_field_lists).to.have.lengthOf(0)
  })

  it('should parse composite primary key', () => {
    const sql = `
CREATE TABLE \`post_keyword\` (
  \`post_id\` int(10) unsigned NOT NULL,
  \`keyword_id\` int(10) unsigned NOT NULL,
  PRIMARY KEY (\`post_id\`, \`keyword_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`
    const field_list = parseCreateTable(sql).field_list
    const post_id = field_list.find(field => field.name === 'post_id')
    const keyword_id = field_list.find(field => field.name === 'keyword_id')
    expect(post_id!.is_primary_key).to.be.true
    expect(keyword_id!.is_primary_key).to.be.true
  })
})

describe('mysql-parser collate TestSuit', () => {
  it('should parse collate from varchar column', () => {
    const sql = `
CREATE TABLE \`product\` (
  \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`name\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`sku\` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  \`slug\` varchar(255) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`
    const fields = parseCreateTable(sql).field_list

    // varchar WITH collate
    const nameField = fields.find(field => field.name === 'name')
    expect(nameField).not.to.be.undefined
    expect(nameField!.collate).to.equals('utf8mb4_unicode_ci')

    // varchar WITH different collate
    const skuField = fields.find(f => f.name === 'sku')
    expect(skuField).not.to.be.undefined
    expect(skuField!.collate).to.equals('utf8mb4_bin')

    // varchar WITHOUT collate
    const slugField = fields.find(f => f.name === 'slug')
    expect(slugField).not.to.be.undefined
    expect(slugField!.collate).to.be.undefined
  })

  it('should parse collate from text column', () => {
    const sql = `
CREATE TABLE \`post\` (
  \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`title\` text COLLATE utf8mb4_unicode_ci NOT NULL,
  \`content\` text,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`
    const fields = parseCreateTable(sql).field_list

    // text WITH collate
    const titleField = fields.find(field => field.name === 'title')
    expect(titleField).not.to.be.undefined
    expect(titleField!.collate).to.equals('utf8mb4_unicode_ci')

    // text WITHOUT collate
    const contentField = fields.find(f => f.name === 'content')
    expect(contentField).not.to.be.undefined
    expect(contentField!.collate).to.be.undefined
  })
})
