import { StoredString } from './storage'

const separator = '-'.repeat(10)

export type Column = { table: string; field: string }

function findColumnIndex(
  columns: Column[],
  table: string,
  field: string,
): number {
  return columns.findIndex(
    column => column.table === table && column.field === field,
  )
}

export class QueryInputController {
  constructor(
    private input: HTMLTextAreaElement,
    private stored: StoredString,
  ) {}

  getColumns(): Column[] {
    let text = this.input.value || this.stored.value
    text = text.split(separator)[0]
    return text
      .split('\n')
      .map(line => line.trim().split('.'))
      .filter(parts => parts.length == 2)
      .map(([table, field]) => {
        return { table, field }
      })
  }

  private update(columns: Column[]): void {
    let text = columns
      .map(column => `${column.table}.${column.field}`)
      .join('\n')
    text += '\n' + separator + '\n'
    text += 'TODO'
    this.input.value = text
    this.stored.value = text
  }

  addColumn(table: string, field: string) {
    const columns = this.getColumns()
    const idx = findColumnIndex(columns, table, field)
    if (idx !== -1) return
    columns.push({ table, field })
    this.update(columns)
  }

  removeColumn(table: string, field: string) {
    const columns = this.getColumns()
    const idx = findColumnIndex(columns, table, field)
    if (idx === -1) return
    columns.splice(idx, 1)
    this.update(columns)
  }
}
