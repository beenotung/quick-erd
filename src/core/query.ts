import type * as ast from './ast'
import { toTsType } from './ts-type'

export type Column = {
  table: string
  field: string
}

function emptySelect(): Select {
  return {
    fromTable: { name: '', fields: new Map() },
    joins: [],
    expandedSelectFields: [],
  }
}

export function generateQuery(columns: Column[], tableList: ast.Table[]) {
  const schema = buildSchema(tableList)
  const selection = makeJoinSelection(schema, columns)
  function makeSelect(): Select {
    if (selection.selectedFields.length === 0) return emptySelect()
    markFieldAliases(selection.selectedFields)
    const fromTable = makeFrom(selection)
    const joins = makeJoins(fromTable, selection)
    return makeExpandedSelectFields(fromTable, joins, selection.selectedFields)
  }
  const select = makeSelect()
  return {
    tsType: selectToTsType(select),
    sql: selectToSQL(select),
    knex: selectToKnex(select),
  }
}

type Schema = {
  tables: Map<string, Table>
}

type Table = {
  name: string
  fields: Map<string, Field>
}

type Field = {
  table: Table
  name: string
  ts_type: string
  reference: ast.ForeignKeyReference | undefined
  alias: string | null
}

function getTable(schema: Schema, name: string): Table {
  const table = schema.tables.get(name)
  if (!table) {
    throw new Error(`Table ${name} not found`)
  }
  return table
}

function getField(table: Table, name: string): Field {
  const field = table.fields.get(name)
  if (!field) {
    throw new Error(`Field ${name} not found`)
  }
  return field
}

function buildSchema(tableList: ast.Table[]): Schema {
  const tables = new Map<string, Table>()
  for (const table of tableList) {
    tables.set(table.name, buildTable(table))
  }
  return { tables }
}

function buildTable(ast_table: ast.Table): Table {
  const fields: Map<string, Field> = new Map()
  const table: Table = {
    name: ast_table.name,
    fields,
  }
  for (const field of ast_table.field_list) {
    fields.set(field.name, buildField(table, field))
  }
  return table
}

function buildField(table: Table, field: ast.Field): Field {
  let ts_type = toTsType(field.type)
  if (field.is_null) {
    ts_type = 'null | ' + ts_type
  }
  return {
    table,
    name: field.name,
    ts_type,
    reference: field.references,
    alias: field.name.endsWith('_id')
      ? null
      : makeFieldAlias(table.name, field.name),
  }
}

type Selection = {
  joins: Join[]
  selectedTables: Set<Table>
  selectedFields: Field[]
}

type Join = {
  left: Field
  right: Field
  as: string | null
}

function makeJoinSelection(schema: Schema, columns: Column[]): Selection {
  const joins: Join[] = []
  const selectedTables = new Set<Table>()
  const selectedFields: Field[] = []
  for (const column of columns) {
    const table = getTable(schema, column.table)
    const field = getField(table, column.field)
    selectedTables.add(table)
    selectedFields.push(field)
    if (field.reference) {
      const reference = makeReference(schema, field.reference)
      joins.push({
        left: field,
        right: reference,
        as: makeAsTableAlias(field, reference.table),
      })
    }
  }
  return {
    joins: removeUnnecessaryJoins(joins, selectedTables),
    selectedTables,
    selectedFields,
  }
}

function makeReference(schema: Schema, reference: ast.ForeignKeyReference) {
  const table = getTable(schema, reference.table)
  const field = getField(table, reference.field)
  return field
}

function makeAsTableAlias(field: Field, table: Table): string | null {
  if (field.name == 'id') {
    return null
  }
  const asTable = field.name.replace(/_id$/, '')
  if (field.reference?.table == field.table.name) {
    return asTable == table.name ? asTable + '2' : asTable
  }
  return asTable == table.name ? null : asTable
}

function removeUnnecessaryJoins(joins: Join[], selectedTables: Set<Table>) {
  return joins.filter(
    join =>
      selectedTables.has(join.left.table) &&
      selectedTables.has(join.right.table),
  )
}

function markFieldAliases(selectedFields: Field[]): void {
  const fieldsByName = countFieldNames(selectedFields)
  for (const fields of fieldsByName.values()) {
    if (fields.length > 1) {
      for (const field of fields) {
        field.alias = makeFieldAlias(field.table.name, field.name)
      }
    }
  }
}

function countFieldNames(selectedFields: Field[]): Map<string, Field[]> {
  const fieldsByName = new Map<string, Field[]>()
  for (const field of selectedFields) {
    const fields = fieldsByName.get(field.name)
    if (fields) {
      fields.push(field)
    } else {
      fieldsByName.set(field.name, [field])
    }
  }
  return fieldsByName
}

function makeFieldAlias(tableName: string, fieldName: string): string {
  return tableName + '_' + fieldName
}

function makeFrom(selection: Selection): Table {
  const rightTables = new Set<Table>()
  for (const join of selection.joins) {
    if (join.left.table == join.right.table) continue
    rightTables.add(join.right.table)
  }
  for (const table of selection.selectedTables) {
    if (!rightTables.has(table)) {
      return table
    }
  }
  throw new Error('Cannot determine left-most table to select from')
}

function makeJoins(fromTable: Table, selection: Selection): Join[] {
  const joins: Join[] = []
  const pendingJoins = new Set<Join>(selection.joins)
  const connectedTables = new Set<Table>()
  connectedTables.add(fromTable)
  for (;;) {
    const oldPendingCount = pendingJoins.size
    for (const join of pendingJoins) {
      if (connectedTables.has(join.left.table)) {
        joins.push(join)
        pendingJoins.delete(join)
        connectedTables.add(join.right.table)
      }
    }
    const newPendingCount = pendingJoins.size
    if (newPendingCount == 0) break
    if (newPendingCount < oldPendingCount) continue
    throw new JoinError(Array.from(pendingJoins))
  }
  return joins
}

class JoinError extends Error {
  constructor(public pendingJoins: Join[]) {
    super(
      `Cannot determine join order, pending joined: ${Array.from(pendingJoins)
        .map(join => {
          const left = join.left.table.name
          const right = join.right.table.name
          return join.as
            ? `${left} join ${right} as ${join.as}`
            : `${left} join ${right}`
        })
        .join(', ')}`,
    )
  }
}

type Select = {
  fromTable: Table
  joins: Join[]
  expandedSelectFields: ExpandedSelectField[]
}

type ExpandedSelectField = {
  table: string
  field: string
  ts_type: string
  table_alias: string | null
  field_alias: string | null
}

function makeExpandedSelectFields(
  fromTable: Table,
  joins: Join[],
  selectedFields: Field[],
): Select {
  const expandedSelectFields: ExpandedSelectField[] = []
  const pickFromTable = (table: Table, asTable: string | null) => {
    for (const field of selectedFields) {
      if (field.table == table) {
        expandedSelectFields.push({
          table: table.name,
          field: field.name,
          ts_type: field.ts_type,
          table_alias: asTable,
          field_alias: asTable
            ? makeFieldAlias(asTable, field.name)
            : field.alias,
        })
      }
    }
  }
  pickFromTable(fromTable, null)
  for (const join of joins) {
    pickFromTable(join.right.table, join.as)
  }
  return { fromTable, joins, expandedSelectFields }
}

function selectToTsType(select: Select): string {
  let code = 'export type Row = {'
  for (const field of select.expandedSelectFields) {
    const name = field.field_alias || field.field
    code += `\n  ${name}: ${field.ts_type}`
  }
  code += '\n}'
  return code
}

function selectToSQL(select: Select): string {
  if (select.expandedSelectFields.length == 0) return ''
  let sql = 'select'
  for (const field of select.expandedSelectFields) {
    const table_name = field.table_alias || field.table
    sql += '\n, ' + table_name + '.' + field.field
    if (field.field_alias) {
      sql += ' as ' + field.field_alias
    }
  }
  // first select column don't need to start with comma
  sql = sql.replace(',', ' ') // re
  sql += '\nfrom ' + select.fromTable.name
  for (const join of select.joins) {
    sql += '\n' + joinToSQL(join)
  }
  return sql
}

function joinToSQL(join: Join): string {
  let rightTable: string = join.right.table.name
  let sql = 'inner join ' + rightTable
  if (join.as) {
    rightTable = join.as
    sql += ' as ' + rightTable
  }
  sql += ' on ' + rightTable + '.' + join.right.name
  sql += ' = ' + join.left.table.name + '.' + join.left.name
  return sql
}

function selectToKnex(select: Select): string {
  if (select.expandedSelectFields.length == 0) return ''
  let knex = 'knex'
  knex += `\n  .from('${select.fromTable.name}')`
  for (const join of select.joins) {
    knex += `\n  ` + joinToKnex(join)
  }
  knex += '\n  .select('
  for (const field of select.expandedSelectFields) {
    const table_name = field.table_alias || field.table
    knex += "\n    '" + table_name + '.' + field.field
    if (field.field_alias) {
      knex += ' as ' + field.field_alias
    }
    knex += "',"
  }
  knex += '\n  )'
  return knex
}

function joinToKnex(join: Join): string {
  let rightTable: string = join.right.table.name
  let knex = ".innerJoin('" + rightTable
  if (join.as) {
    rightTable = join.as
    knex += ' as ' + rightTable
  }
  knex += "', '" + rightTable + '.' + join.right.name
  knex += "', '" + join.left.table.name + '.' + join.left.name + "')"
  return knex
}
