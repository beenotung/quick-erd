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

function parseParts(text: string) {
  const parts = text.split(separator).map(part => part.trim())
  return parts
}

function isColumnsSame(newColumns: Column[], oldColumns: Column[]): boolean {
  const n = newColumns.length
  if (n != oldColumns.length) return false
  for (let i = 0; i < n; i++) {
    const c = newColumns[i]
    const d = oldColumns[i]
    if (c.table != d.table) return false
    if (c.field != d.field) return false
  }
  return true
}

export class QueryInputController {
  private columns = parseColumns(this.getParts()[0])
  constructor(
    private input: HTMLTextAreaElement,
    private stored: StoredString,
    private getTableList: () => ParseResult['table_list'],
  ) {}

  cleanColumns() {
    const parts = this.getParts()
    const tables = this.getTableList()
    const columns = this.columns
    const n = columns.length
    columns.forEach(column => {
      const table = tables.find(table => table.name === column.table)
      if (
        table &&
        table.field_list.some(field => field.name === column.field)
      ) {
        return
      }
      const idx = columns.indexOf(column)
      columns.splice(idx, 1)
    })
    if (columns.length === n) return
    this.update(columns, parts)
  }

  private getParts() {
    const text = this.input.value || this.stored.value
    return parseParts(text)
  }

  checkUpdate(text: string) {
    const parts = parseParts(text)
    const newColumns: Column[] = parseColumns(parts[0])
    if (isColumnsSame(newColumns, this.columns)) return
    this.columns = newColumns
    this.update(newColumns, parts)
    return newColumns
  }

  private update(columns: Column[], previousParts: string[]): void {
    const parts: string[] = []

    parts[0] = columns
      .map(column => `${column.table}.${column.field}`)
      .join('\n')

    const query = generateQuery(columns, this.getTableList())

    parts[1] = query.tsType
    parts[2] = query.sql
    parts[3] = query.knex
    parts[4] = previousParts[4] || 'remark here is preserved...'

    const text = parts.join('\n\n' + separator + '\n\n')

    this.input.value = text
    this.stored.value = text
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
