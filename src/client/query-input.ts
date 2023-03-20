import { ParseResult } from '../core/ast'
import { Column, findColumnIndex, generateQuery } from '../core/query'
import { StoredString } from './storage'

const separator = '-'.repeat(10)

function parseColumns(part: string) {
  return part
    .split('\n')
    .map(line => line.trim().split('.'))
    .filter(parts => parts.length == 2)
    .map(([table, field]) => {
      return { table, field }
    })
}

export class QueryInputController {
  private columns = this.getColumns()
  constructor(
    private input: HTMLTextAreaElement,
    private stored: StoredString,
    private getTableList: () => ParseResult['table_list'],
  ) {}

  private getParts() {
    const text = this.input.value || this.stored.value
    const parts = text.split(separator).map(part => part.trim())
    return parts
  }

  private update(columns: Column[], previousParts: string[]): void {
    const parts: string[] = []

    parts[0] = columns
      .map(column => `${column.table}.${column.field}`)
      .join('\n')

    parts[1] = generateQuery(columns, this.getTableList())

    parts[2] = previousParts[2]

    const text = parts.join('\n\n' + separator + '\n\n')

    this.input.value = text
    this.stored.value = text
  }

  getColumns(parts: string[] = this.getParts()) {
    return parseColumns(parts[0])
  }

  addColumn(table: string, field: string) {
    const parts = this.getParts()
    const columns = this.columns
    const idx = findColumnIndex(columns, table, field)
    if (idx !== -1) return
    columns.push({ table, field })
    this.update(columns, parts)
  }

  removeColumn(table: string, field: string) {
    const parts = this.getParts()
    const columns = this.columns
    const idx = findColumnIndex(columns, table, field)
    if (idx === -1) return
    columns.splice(idx, 1)
    this.update(columns, parts)
  }

  hasColumn(table: string, field: string): boolean {
    return this.columns.some(
      column => column.table === table && column.field === field,
    )
  }
}
