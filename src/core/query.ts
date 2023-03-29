import { ParseResult, Table } from './ast'
import { toTsType } from './ts-type'

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
  ts_type: string
}

function findPath(
  currentTable: Table,
  column: ColumnForPath,
  columns: ColumnForPath[],
  tableList: ParseResult['table_list'],
  tablePath: TablePath,
  visited: Set<Table>,
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
    if (visited.has(refTable)) continue
    const newVisited = new Set(visited)
    newVisited.add(refTable)

    const refField =
      refFieldNames.length == 1
        ? refFieldNames[0]
        : refFieldNames.filter(refFieldName =>
            columns.some(
              column =>
                column.field === refFieldName &&
                refFromTables.get(refTableName)?.includes(column.table.name),
            ),
          )[0] || refFieldNames[0]

    const result = findPath(
      refTable,
      column,
      columns,
      tableList,
      [...tablePath, { tableName: currentTable.name, refField }],
      newVisited,
    )
    if (result.length > 0) return result
  }

  return []
}

export function generateQuery(
  _columns: Column[],
  tableList: ParseResult['table_list'],
): {
  sql: string
  tsType: string
  knex: string
} {
  const columns: ColumnForPath[] = []
  for (const col of _columns) {
    const table = tableList.find(table => table.name === col.table)
    if (!table) continue
    const field = table.field_list.find(field => field.name == col.field)
    if (!field) continue
    let ts_type = toTsType(field.type)
    if (field.is_null) {
      ts_type = 'null | ' + ts_type
    }
    columns.push({
      table,
      field: field.name,
      ts_type,
    })
  }

  let tsType = 'export type Row = {'

  if (columns.length === 0) {
    tsType += '\n}'
    return { sql: '', tsType, knex: '' }
  }

  let baseTable = columns[0].table

  let combines = columns.map(column => ({
    column,
    path: findPath(baseTable, column, columns, tableList, [], new Set()),
  }))
  let remains = combines.filter(entry => entry.path.length === 0)

  if (remains.length > 0) {
    for (const entry of combines) {
      if (entry.path.length > 0) continue
      // this entry is not reachable from baseTable
      const newBaseTable = entry.column.table
      const newCombines = columns.map(column => ({
        column,
        path: findPath(newBaseTable, column, columns, tableList, [], new Set()),
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

  const fieldNameCounts = new Map<string, number>()
  const selectColumns: {
    table: string
    field: string
    name: string
    ts_type: string
  }[] = []
  let from = 'from ' + baseTable.name

  let knex = `knex
  .from('${baseTable.name}')`

  const tables = new Set<string>()
  tables.add(baseTable.name)

  combines
    .sort((a, b) => a.path.length - b.path.length)
    .forEach(({ column, path }) => {
      if (path.length === 0) return

      const tableName = getRefTableName(path, path.length - 1)
      const fieldName = column.field

      const name = tableName + '.' + fieldName
      selectColumns.push({
        table: tableName,
        field: fieldName,
        name,
        ts_type: column.ts_type,
      })
      fieldNameCounts.set(fieldName, (fieldNameCounts.get(fieldName) || 0) + 1)

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
        knex += `
  .innerJoin('${currentNode.tableName}`
        if (currentNode.tableName !== currentTableName) {
          from += ' as ' + currentTableName
          knex += ' as ' + currentTableName
        }
        from += ` on ${currentTableName}.id = ${previousTableName}.${refField}`
        knex += `', '${currentTableName}.id', '${previousTableName}.${refField}')`
      })
    })

  let select = 'select'
  knex += `
  .select(`

  selectColumns.forEach(({ table, field, name, ts_type }, i) => {
    const count = fieldNameCounts.get(field) || 1
    if (i === 0) {
      select += '\n  '
    } else {
      select += '\n, '
    }
    select += name
    knex += `
    '${name}`
    if (count > 1) {
      name = table + '_' + field
      select += ' as ' + name
      knex += ' as ' + name
    } else {
      name = field
    }
    knex += `',`
    tsType += `\n  ${name}: ${ts_type}`
  })

  tsType += '\n}'
  knex += `
  )`

  const sql = select + '\n' + from

  return { tsType, sql, knex }
}
