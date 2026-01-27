import { expect } from 'chai'
import { Field, Table } from '../core/ast'
import { generateAutoMigrate } from './auto-migrate'
describe('auto-migrate TestSuit', () => {
  context('change reference table', () => {
    let up_lines: string
    let down_lines: string

    before(() => {
      const existing_table_list: Table[] = [
        {
          name: 'content',
          field_list: [
            {
              name: 'author_id',
              type: 'integer',
              is_primary_key: false,
              is_null: false,
              is_unique: false,
              is_unsigned: true,
              default_value: undefined,
              references: { table: 'author', field: 'id', type: '>0-' },
            },
          ],
        },
      ]
      const parsed_table_list: Table[] = [
        {
          name: 'content',
          field_list: [
            {
              name: 'author_id',
              type: 'integer',
              is_primary_key: false,
              is_null: false,
              is_unique: false,
              is_unsigned: true,
              default_value: undefined,
              references: { table: 'user', field: 'id', type: '>0-' },
            },
          ],
        },
      ]
      const result = generateAutoMigrate({
        existing_table_list,
        parsed_table_list,
        detect_rename: false,
        db_client: 'mock',
      })
      up_lines = result.up_lines.join('\n')
      down_lines = result.down_lines.join('\n')
    })

    it('should add new foreign key in up function', () => {
      expect(up_lines).to.contains(
        `table.foreign('author_id').references('user.id')`,
      )
    })
    it('should remove new foreign key in down function', () => {
      expect(down_lines).to.contains(`table.dropForeign('author_id')`)
    })
    it('should remove old foreign key in up function', () => {
      expect(up_lines).to.contains(`table.dropForeign('author_id')`)
    })
    it('should restore old foreign key in down function', () => {
      expect(down_lines).to.contains(
        `table.foreign('author_id').references('author.id')`,
      )
    })
    it('should remove old foreign key before add new foreign key in up function', () => {
      const dropIndex = up_lines.indexOf('dropForeign')
      const addIndex = up_lines.indexOf("references('user.id')")
      expect(dropIndex).not.to.equals(-1)
      expect(addIndex).not.to.equals(-1)
      expect(dropIndex).to.be.lessThan(addIndex)
    })
    it('should remove new foreign key before restore old foreign key in down function', () => {
      const dropIndex = down_lines.indexOf('dropForeign')
      const addIndex = down_lines.indexOf("references('author.id')")
      expect(dropIndex).not.to.equals(-1)
      expect(addIndex).not.to.equals(-1)
      expect(dropIndex).to.be.lessThan(addIndex)
    })
  })
  context('auto add column', () => {
    let up_lines: string
    let down_lines: string

    before(() => {
      const username: Field = {
        name: 'username',
        type: 'text',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      }
      const score: Field = {
        name: 'score',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      }
      const existing_table_list: Table[] = [
        {
          name: 'content',
          field_list: [username],
        },
      ]
      const parsed_table_list: Table[] = [
        {
          name: 'content',
          field_list: [username, score],
        },
      ]
      const result = generateAutoMigrate({
        existing_table_list,
        parsed_table_list,
        detect_rename: false,
        db_client: 'mock',
      })
      up_lines = result.up_lines.join('\n')
      down_lines = result.down_lines.join('\n')
    })

    it('should add new column in up function', () => {
      expect(up_lines).to.contains("integer('score')")
    })

    it('should remove new column in down function', () => {
      expect(down_lines).to.contains("dropColumn('score')")
    })
  })
  context('auto remove column', () => {
    let up_lines: string
    let down_lines: string

    before(() => {
      const username: Field = {
        name: 'username',
        type: 'text',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      }
      const score: Field = {
        name: 'score',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      }
      const existing_table_list: Table[] = [
        {
          name: 'content',
          field_list: [username, score],
        },
      ]
      const parsed_table_list: Table[] = [
        {
          name: 'content',
          field_list: [username],
        },
      ]
      const result = generateAutoMigrate({
        existing_table_list,
        parsed_table_list,
        detect_rename: false,
        db_client: 'mock',
      })
      up_lines = result.up_lines.join('\n')
      down_lines = result.down_lines.join('\n')
    })

    it('should remove extra column in up function', () => {
      expect(up_lines).to.contains("dropColumn('score')")
    })
    it('should restore extra column in down function', () => {
      expect(down_lines).to.contains("integer('score')")
    })
  })
  context('auto drop table after drop column', () => {
    let up_lines: string
    let down_lines: string

    before(() => {
      const username: Field = {
        name: 'username',
        type: 'text',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      }
      const user_id: Field = {
        name: 'user_id',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: { table: 'user', field: 'id', type: '>0-' },
      }
      const comment: Field = {
        name: 'comment',
        type: 'text',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      }
      const existing_table_list: Table[] = [
        {
          name: 'user',
          field_list: [username],
        },
        {
          name: 'content',
          field_list: [user_id, comment],
        },
      ]
      const parsed_table_list: Table[] = [
        {
          name: 'content',
          field_list: [comment],
        },
      ]
      const result = generateAutoMigrate({
        existing_table_list,
        parsed_table_list,
        detect_rename: false,
        db_client: 'mock',
      })
      up_lines = result.up_lines.join('\n')
      down_lines = result.down_lines.join('\n')
    })

    it('should remove extra table in up function', () => {
      expect(up_lines).to.contains("dropTableIfExists('user')")
    })
    it('should restore extra table in down function', () => {
      expect(down_lines).to.contains("createTable('user',")
    })

    it('should remove extra column in up function', () => {
      expect(up_lines).to.contains("dropColumn('user_id')")
    })
    it('should restore extra column in down function', () => {
      expect(down_lines).to.contains("integer('user_id')")
    })

    it('should remove extra column before drop table in up function', () => {
      const dropColumnIndex = up_lines.indexOf("dropColumn('user_id')")
      const dropTableIndex = up_lines.indexOf("dropTableIfExists('user')")
      expect(dropColumnIndex).to.be.lessThan(dropTableIndex)
    })
    it('should restore extra table before add column in down function', () => {
      const createTableIndex = down_lines.indexOf("createTable('user',")
      const addColumnIndex = down_lines.indexOf("integer('user_id')")
      expect(createTableIndex).to.be.lessThan(addColumnIndex)
    })
  })
  context('auto rename column', () => {
    let up_lines: string
    let down_lines: string

    before(() => {
      const segment_id: Field = {
        name: 'segment_id',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      }
      const bus_segment_id: Field = {
        ...segment_id,
        name: 'bus_segment_id',
      }
      const user_id: Field = {
        ...segment_id,
        name: 'user_id',
      }
      const author_id: Field = {
        ...segment_id,
        name: 'author_id',
      }

      const existing_table_list: Table[] = [
        {
          name: 'busline',
          field_list: [segment_id, user_id],
        },
      ]
      const parsed_table_list: Table[] = [
        {
          name: 'busline',
          field_list: [bus_segment_id, author_id],
        },
      ]
      const result = generateAutoMigrate({
        existing_table_list,
        parsed_table_list,
        detect_rename: true,
        db_client: 'mock',
      })
      up_lines = result.up_lines.join('\n')
      down_lines = result.down_lines.join('\n')
    })

    it('should rename column in up function', () => {
      expect(up_lines).to.contains(
        "renameColumn('segment_id', 'bus_segment_id')",
      )
      expect(up_lines).to.contains("renameColumn('user_id', 'author_id')")
    })
    it('should restore column name in down function', () => {
      expect(down_lines).to.contains(
        "renameColumn('bus_segment_id', 'segment_id')",
      )
      expect(down_lines).to.contains("renameColumn('author_id', 'user_id')")
    })
  })
  context('auto rename column + change reference table', () => {
    let up_lines: string
    let down_lines: string

    before(() => {
      const segment_id: Field = {
        name: 'segment_id',
        type: 'integer',
        is_primary_key: false,
        is_null: false,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: { table: 'segment', field: 'id', type: '>0-' },
      }
      const bus_segment_id: Field = {
        ...segment_id,
        name: 'bus_segment_id',
        references: { table: 'bus_segment', field: 'id', type: '>0-' },
      }

      const existing_table_list: Table[] = [
        {
          name: 'busline',
          field_list: [segment_id],
        },
      ]
      const parsed_table_list: Table[] = [
        {
          name: 'busline',
          field_list: [bus_segment_id],
        },
      ]
      const result = generateAutoMigrate({
        existing_table_list,
        parsed_table_list,
        detect_rename: true,
        db_client: 'mock',
      })
      up_lines = result.up_lines.join('\n')
      down_lines = result.down_lines.join('\n')
    })

    it('should rename column after other operations in up function', () => {
      const dropForeign = "table.dropForeign('segment_id')"
      const renameColumn = "renameColumn('segment_id', 'bus_segment_id')"

      expect(up_lines).to.contains(dropForeign)
      expect(up_lines).to.contains(renameColumn)

      expect(up_lines.indexOf(dropForeign)).to.be.lessThan(
        up_lines.indexOf(renameColumn),
      )
    })
    it('should restore column name before other operations in down function', () => {
      const renameColumn = "renameColumn('bus_segment_id', 'segment_id')"
      const dropForeign = "table.dropForeign('segment_id')"

      expect(down_lines).to.contains(renameColumn)
      expect(down_lines).to.contains(dropForeign)

      expect(up_lines.indexOf(dropForeign)).to.be.greaterThan(
        up_lines.indexOf(renameColumn),
      )
    })
  })
  context('add column for sqlite', () => {
    it('should inline foreign key reference', () => {
      const field: Field = {
        name: 'user_id',
        type: 'integer',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: { table: 'user', field: 'id', type: '>0-' },
      }
      const { up_lines, down_lines } = generateAutoMigrate({
        db_client: 'better-sqlite3',
        existing_table_list: [{ name: 'post', field_list: [] }],
        parsed_table_list: [{ name: 'post', field_list: [field] }],
        detect_rename: false,
      })

      expect(up_lines).to.have.lengthOf(1)
      expect(up_lines[0].trim()).to.equals(
        "await knex.raw('alter table `post` add column `user_id` integer null references `user`(`id`)')",
      )

      expect(down_lines).to.have.lengthOf(1)
      expect(down_lines[0].trim()).to.equals(
        'await knex.schema.alterTable(`post`, table => table.dropColumn(`user_id`))',
      )
    })
    it('should add unique index with knex', () => {
      const field: Field = {
        name: 'name',
        type: 'text',
        is_primary_key: false,
        is_null: false,
        is_unique: true,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      }
      const { up_lines, down_lines } = generateAutoMigrate({
        db_client: 'better-sqlite3',
        existing_table_list: [{ name: 'tag', field_list: [] }],
        parsed_table_list: [{ name: 'tag', field_list: [field] }],
        detect_rename: false,
      })
      expect(up_lines).to.have.lengthOf(2)
      expect(up_lines[0].trim()).to.equals(
        "await knex.raw('alter table `tag` add column `name` text not null')",
      )
      expect(up_lines[1].trim()).to.equals(
        'await knex.schema.alterTable(`tag`, table => table.unique([`name`]))',
      )

      expect(down_lines).to.have.lengthOf(2)
      expect(down_lines[0].trim()).to.equals(
        'await knex.schema.alterTable(`tag`, table => table.dropUnique([`name`]))',
      )
      expect(down_lines[1].trim()).to.equals(
        'await knex.schema.alterTable(`tag`, table => table.dropColumn(`name`))',
      )
    })
    it('should detect table rename', () => {
      const { up_lines, down_lines } = generateAutoMigrate({
        db_client: 'better-sqlite3',
        existing_table_list: [
          { name: 'user', field_list: [] },
          { name: 'post', field_list: [] },
        ],
        parsed_table_list: [
          { name: 'user', field_list: [] },
          { name: 'article', field_list: [] },
        ],
        detect_rename: true,
      })
      expect(up_lines).to.have.lengthOf(1)
      expect(up_lines[0].trim()).to.equals(
        "await knex.schema.renameTable('post', 'article')",
      )

      expect(down_lines).to.have.lengthOf(1)
      expect(down_lines[0].trim()).to.equals(
        "await knex.schema.renameTable('article', 'post')",
      )
    })
  })
  context('alter column for sqlite', () => {
    it('should alter nullable type', () => {
      const old_field: Field = {
        name: 'remark',
        type: 'integer',
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      }
      const new_field: Field = {
        ...old_field,
        type: 'text',
      }
      const { up_lines, down_lines } = generateAutoMigrate({
        db_client: 'better-sqlite3',
        existing_table_list: [{ name: 'user', field_list: [old_field] }],
        parsed_table_list: [{ name: 'user', field_list: [new_field] }],
        detect_rename: false,
      })
      expect(up_lines).to.have.lengthOf(1)
      expect(up_lines[0].trim()).to.equals(
        `
  // alter type for \`user\`.\`remark\`
  {
    const rows = await knex.select(\`id\`, \`remark\`).from(\`user\`)
    await knex.raw('alter table \`user\` drop column \`remark\`')
    await knex.raw('alter table \`user\` add column \`remark\` text null')
    for (let row of rows) {
      await knex(\`user\`).update({ remark: row.remark }).where({ id: row.id })
    }
  }`.trim(),
      )
      expect(down_lines).to.have.lengthOf(1)
      expect(down_lines[0].trim()).to.equals(
        `
  // alter type for \`user\`.\`remark\`
  {
    const rows = await knex.select(\`id\`, \`remark\`).from(\`user\`)
    await knex.raw('alter table \`user\` drop column \`remark\`')
    await knex.raw('alter table \`user\` add column \`remark\` integer null')
    for (let row of rows) {
      await knex(\`user\`).update({ remark: row.remark }).where({ id: row.id })
    }
  }`.trim(),
      )
    })
    it('should alter nullable enum values', () => {
      const old_field: Field = {
        name: 'role',
        type: `enum('admin','user')`,
        is_primary_key: false,
        is_null: true,
        is_unique: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      }
      const new_field: Field = {
        ...old_field,
        type: `enum('admin','user','guest')`,
      }
      const { up_lines, down_lines } = generateAutoMigrate({
        db_client: 'better-sqlite3',
        existing_table_list: [{ name: 'user', field_list: [old_field] }],
        parsed_table_list: [{ name: 'user', field_list: [new_field] }],
        detect_rename: false,
      })
      expect(up_lines).to.have.lengthOf(1)
      expect(up_lines[0].trim()).to.equals(
        `
  // alter enum for \`user\`.\`role\`
  {
    const rows = await knex.select(\`id\`, \`role\`).from(\`user\`)
    await knex.raw('alter table \`user\` drop column \`role\`')
    await knex.raw("alter table \`user\` add column \`role\` text null check (\`role\` in ('admin','user','guest'))")
    for (let row of rows) {
      await knex(\`user\`).update({ role: row.role }).where({ id: row.id })
    }
  }`.trim(),
      )
      expect(down_lines).to.have.lengthOf(1)
      expect(down_lines[0].trim()).to.equals(
        `
  // alter enum for \`user\`.\`role\`
  {
    const rows = await knex.select(\`id\`, \`role\`).from(\`user\`)
    await knex.raw('alter table \`user\` drop column \`role\`')
    await knex.raw("alter table \`user\` add column \`role\` text null check (\`role\` in ('admin','user'))")
    for (let row of rows) {
      await knex(\`user\`).update({ role: row.role }).where({ id: row.id })
    }
  }`.trim(),
      )
    })
    it('should alter non-nullable type')
    it('should alter non-nullable enum values')
  })
})
