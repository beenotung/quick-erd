import { expect } from 'chai'
import { Table } from '../core/ast'
import { generateAutoMigrate } from './auto-migrate'
describe('auto-migrate TestSuit', () => {
  context('change reference table', () => {
    let up_lines: string
    let down_lines: string

    before(() => {
      let existing_table_list: Table[] = [
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
              references: { table: 'author', field: 'id', type: '>0-' },
            },
          ],
        },
      ]
      let parsed_table_list: Table[] = [
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
              references: { table: 'user', field: 'id', type: '>0-' },
            },
          ],
        },
      ]
      let result = generateAutoMigrate({
        existing_table_list,
        parsed_table_list,
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
      let dropIndex = up_lines.indexOf('dropForeign')
      let addIndex = up_lines.indexOf("references('user.id')")
      expect(dropIndex).not.to.equals(-1)
      expect(addIndex).not.to.equals(-1)
      expect(dropIndex).to.be.lessThan(addIndex)
    })
    it('should remove new foreign key before restore old foreign key in down function', () => {
      let dropIndex = down_lines.indexOf('dropForeign')
      let addIndex = down_lines.indexOf("references('author.id')")
      expect(dropIndex).not.to.equals(-1)
      expect(addIndex).not.to.equals(-1)
      expect(dropIndex).to.be.lessThan(addIndex)
    })
  })
  context('remove column', () => {
    // TODO
  })
})
