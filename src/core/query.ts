import { QueryInputController } from '../client/query-input'

type Column = {
  table: string
  field: string
}

export class QueryBuilder {
  private columns: Column[] = this.inputController.getColumns()

  constructor(private inputController: QueryInputController) {}

  addColumn(table: string, field: string) {
    this.columns.push({ table, field })
    this.inputController.addColumn(table, field)
  }

  removeColumn(table: string, field: string) {
    const idx = this.findColumnIndex(table, field)
    if (idx === -1) return
    this.columns.splice(idx, 1)
    this.inputController.removeColumn(table, field)
  }

  private findColumnIndex(table: string, field: string) {
    const idx = this.columns.findIndex(
      column => column.table === table && column.field === field,
    )
    return idx
  }

  hasColumn(table: string, field: string): boolean {
    return this.findColumnIndex(table, field) !== -1
  }
}
