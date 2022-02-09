import { Table } from '../core/ast'

export function sortTables(table_list: Table[]): Table[] {
  table_list = table_list.slice()
  for (let i = 0; i < table_list.length; i++) {
    table_list.slice().forEach(self => {
      self.field_list.forEach(field => {
        const ref = field.references
        if (!ref) return

        const other = table_list.find(table => table.name === ref.table)
        if (!other) return

        const selfIndex = table_list.indexOf(self)
        const otherIndex = table_list.indexOf(other)

        if (otherIndex <= selfIndex) return

        table_list[otherIndex] = self
        table_list[selfIndex] = other
      })
    })
  }
  return table_list
}
