import { ParseResult } from '../core/ast'
import { Column, generateQuery } from '../core/query'
import { StoredBoolean, StoredString } from './storage'
import { querySelector } from './dom'
import { showCopyResult } from './copy'

const separator = '-'.repeat(10)

export function parseColumns(part: string): Column[] {
  return part
    .split('\n')
    .map(line => line.trim().split('.'))
    .filter(parts => parts.length == 2)
    .map(([table, field]) => {
      return { table, field }
    })
}

export function parseParts(text: string) {
  const parts = text.split(separator).map(part => part.trim())
  return parts
}

function getRemarks(parts: string[]) {
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim()
    if (
      part.startsWith('export type ') ||
      part.startsWith('select\n  ') ||
      part.startsWith(`knex
  .from('`)
    ) {
      continue
    }
    return part
  }
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

function findColumnIndex(
  columns: Column[],
  table: string,
  field: string,
): number {
  return columns.findIndex(
    column => column.table === table && column.field === field,
  )
}
export class QueryOutputControl {
  private checkbox: HTMLInputElement

  constructor(
    private fieldset: HTMLFieldSetElement,
    private queryInputController: QueryInputController,
    private getText: () => string | undefined,
  ) {
    this.checkbox = this.fieldset.querySelector(
      'input[type=checkbox]',
    ) as HTMLInputElement

    const id = this.fieldset.id
    const key = id + 'Enabled'
    const stored = new StoredBoolean(key, true)

    this.checkbox.checked = stored.value
    this.checkbox.addEventListener('change', () => {
      stored.value = this.checkbox.checked
      this.queryInputController.checkUpdate({ skipSame: false })
    })

    const copyBtn = this.fieldset.querySelector(
      '.copy-btn',
    ) as HTMLButtonElement
    copyBtn.addEventListener('click', () => {
      const text = this.getText()
      if (!text) return
      const result = Promise.resolve(this.queryInputController.copy(text))
      showCopyResult(copyBtn, result)
    })
  }

  getShouldShow() {
    return this.checkbox.checked
  }
}

export class QueryInputController {
  private columns: Column[]
  private resultRowType: QueryOutputControl
  private sqlQuery: QueryOutputControl
  private knexQuery: QueryOutputControl
  private lastQuery?: ReturnType<typeof generateQuery>
  constructor(
    private input: HTMLTextAreaElement,
    private stored: StoredString,
    private getTableList: () => ParseResult['table_list'],
  ) {
    this.columns = parseColumns(this.getParts()[0])
    this.resultRowType = new QueryOutputControl(
      querySelector(document.body, '#resultRowType'),
      this,
      () => this.getQuery().tsType,
    )
    this.sqlQuery = new QueryOutputControl(
      querySelector(document.body, '#sqlQuery'),
      this,
      () => this.getQuery().sql,
    )
    this.knexQuery = new QueryOutputControl(
      querySelector(document.body, '#knexQuery'),
      this,
      () => this.getQuery().knex,
    )
  }

  copy(text: string) {
    const input = this.input
    const index = input.value.indexOf(text)
    if (index == -1) return 'skip' as const
    input.select()

    input.selectionStart = index
    input.selectionEnd = index + text.length

    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).then(() => true)
    } else {
      return document.execCommand('copy')
    }
  }

  cleanColumns() {
    const parts = this.getParts()
    const tables = this.getTableList()
    const columns = this.columns
    const n = columns.length
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i]
      const table = tables.find(table => table.name === column.table)
      if (
        table &&
        table.field_list.some(field => field.name === column.field)
      ) {
        continue
      }
      columns.splice(i, 1)
      i--
    }
    if (columns.length === n) return
    this.update(columns, parts)
  }

  private getParts() {
    const text = this.input.value
    return parseParts(text)
  }

  checkUpdate(flags: { skipSame: boolean }) {
    const text = this.input.value
    const parts = parseParts(text)
    const newColumns: Column[] = parseColumns(parts[0])
    if (flags.skipSame && isColumnsSame(newColumns, this.columns)) return
    this.columns = newColumns
    this.update(newColumns, parts)
    return newColumns
  }

  private getQuery() {
    if (!this.lastQuery) {
      const parts = this.getParts()
      const columns = parseColumns(parts[0])
      const query = generateQuery(columns, this.getTableList())
      this.lastQuery = query
    }
    return this.lastQuery
  }

  private update(columns: Column[], previousParts: string[]): void {
    const parts: string[] = []

    parts.push(
      columns.map(column => `${column.table}.${column.field}`).join('\n'),
    )

    const query = generateQuery(columns, this.getTableList())
    this.lastQuery = query

    if (this.resultRowType.getShouldShow()) {
      parts.push(query.tsType)
    }
    if (this.sqlQuery.getShouldShow()) {
      parts.push(query.sql)
    }
    if (this.knexQuery.getShouldShow()) {
      parts.push(query.knex)
    }

    parts.push(getRemarks(previousParts) || 'remark here is preserved...')

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
