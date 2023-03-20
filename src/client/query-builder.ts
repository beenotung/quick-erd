import { ParseResult, Table } from '../core/ast'
import { QueryInputController } from './query-input'

export type Column = { table: string; field: string }

export function findColumnIndex(
  columns: Column[],
  table: string,
  field: string,
): number {
  return columns.findIndex(
    column => column.table === table && column.field === field,
  )
}

type TablePath = {
  tableName: string
  refField?: string
}[]

function getRefTableName(path: TablePath, currentIdx: number) {
  const previousNode = path[currentIdx - 1]
  const currentNode = path[currentIdx]
  return previousNode?.refField?.replace('_id', '') || currentNode.tableName
}

export type ColumnForPath = {
  field: string
  table: Table
}

function findPath(
  currentTable: Table,
  column: ColumnForPath,
  columns: ColumnForPath[],
  tableList: ParseResult['table_list'],
  tablePath: TablePath,
): TablePath {
  const columnTableName = column.table.name
  if (currentTable.name === columnTableName) {
    return [...tablePath, { tableName: columnTableName }]
  }

  // tableName -> refFieldNames
  const refTables = new Map<string, string[]>()
  for (const field of currentTable.field_list) {
    if (!field.references) continue
    const refFieldNames = refTables.get(field.references.table)
    if (refFieldNames) {
      refFieldNames.push(field.name)
    } else {
      refTables.set(field.references.table, [field.name])
    }
  }

  const refFromTables = new Map<string, string[]>()
  for (const table of tableList) {
    for (const field of table.field_list) {
      if (!field.references) continue
      const key = field.references.table
      const tables = refFromTables.get(key)
      if (tables) {
        tables.push(table.name)
      } else {
        refFromTables.set(key, [table.name])
      }
    }
  }

  for (const [refTableName, refFieldNames] of refTables.entries()) {
    const refTable = tableList.find(table => table.name === refTableName)
    if (!refTable) continue

    const refField =
      refFieldNames.filter(refFieldName =>
        columns.some(
          column =>
            column.field === refFieldName &&
            refFromTables.get(refTableName)?.includes(columnTableName),
        ),
      )[0] || refFieldNames[0]

    const result = findPath(refTable, column, columns, tableList, [
      ...tablePath,
      { tableName: currentTable.name, refField },
    ])
    if (result.length > 0) return result
  }

  return []
}

export function generateQuery(
  _columns: Column[],
  tableList: ParseResult['table_list'],
): string {
  const columns = _columns
    .map(column => ({
      field: column.field,
      table: tableList.find(table => table.name === column.table),
    }))
    .filter(entry => entry.table) as ColumnForPath[]

  if (columns.length === 0) {
    return ''
  }

  if (columns.length === 1) {
    const { table, field } = columns[0]
    return `select ${field} from ${table.name}`
  }

  let baseTable = columns[0].table

  let combines = columns.map(column => ({
    column,
    path: findPath(baseTable, column, columns, tableList, []),
  }))
  let remains = combines.filter(entry => entry.path.length === 0)

  if (remains.length > 0) {
    for (const entry of combines) {
      if (entry.path.length > 0) continue
      // this entry is not reachable from baseTable
      const newBaseTable = entry.column.table
      const newCombines = columns.map(column => ({
        column,
        path: findPath(newBaseTable, column, columns, tableList, []),
      }))
      const newRemains = newCombines.filter(entry => entry.path.length === 0)
      if (newRemains.length < remains.length) {
        baseTable = newBaseTable
        combines = newCombines
        remains = newRemains
        if (newRemains.length === 0) break
      }
    }
  }

  let select = ''
  let from = 'from ' + baseTable.name

  const tables = new Set<string>()
  tables.add(baseTable.name)

  combines
    .sort((a, b) => a.path.length - b.path.length)
    .forEach(({ column, path }) => {
      if (path.length === 0) return

      const tableName = getRefTableName(path, path.length - 1)

      const name = tableName + '.' + column.field
      if (select) {
        select += `
, ${name}`
      } else {
        select += `
  ${name}`
      }

      path.forEach((currentNode, currentIdx) => {
        if (tables.has(currentNode.tableName)) return
        tables.add(currentNode.tableName)
        const previousNode = path[currentIdx - 1]
        const refField = previousNode?.refField
        if (!refField) return
        const previousTableName = getRefTableName(path, currentIdx - 1)
        const currentTableName = getRefTableName(path, currentIdx)
        if (!currentTableName) return
        from += `
inner join ${currentNode.tableName}`
        if (currentNode.tableName !== currentTableName) {
          from += ' as ' + currentTableName
        }
        from += ` on ${currentTableName}.id = ${previousTableName}.${refField}`
      })
    })

  return `select ${select}
${from}`
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
