import { Field, ParseResult, Table } from './ast'
import { Column } from './query'
import { toTsType } from './ts-type'

export function generateQuery(
  columns: Column[],
  tableList: ParseResult['table_list'],
) {
  const graph = new Schema.Graph(tableList)
  const select = new Query.Select(columns, graph)
  return {
    tsType: selectToTsType(select),
    sql: selectToSQL(select),
  }
}

namespace Query {
  export class Select {
    private selectFieldNodes: Schema.FieldNode[]
    fromTableNode?: Schema.TableNode
    joinTables = new Map<Schema.TableNode, Join>()
    tableAliases = new Map<Schema.TableNode, Set<string>>()
    fieldAliases = new Map<Schema.FieldNode, string>()
    finalSelectFields: SelectField[] = []
    constructor(columns: Column[], public graph: Schema.Graph) {
      this.selectFieldNodes = columns.map(column =>
        graph.getTable(column.table).getField(column.field),
      )
      this.findConnections()
      this.deduplicateFieldNames()
      this.makeSelectFields()
    }
    findConnections() {
      const pendingFieldNodes = new Set(this.selectFieldNodes)
      for (; pendingFieldNodes.size > 0; ) {
        const oldCount = pendingFieldNodes.size
        pendingFieldNodes.forEach(fieldNode => {
          if (this.findConnection(fieldNode)) {
            pendingFieldNodes.delete(fieldNode)
          }
        })
        const newCount = pendingFieldNodes.size
        if (oldCount != newCount) continue
        throw new DisconnectedError(Array.from(pendingFieldNodes))
      }
    }
    findConnection(selectFieldNode: Schema.FieldNode): boolean {
      const selectTableNode = selectFieldNode.tableNode
      if (!this.fromTableNode) {
        this.fromTableNode = selectTableNode
        return true
      }
      if (this.fromTableNode == selectTableNode) return true
      if (this.joinTables.has(selectTableNode)) return true

      // reference by connected table
      for (const [
        referenceByFieldNode,
        referenceBy,
      ] of selectTableNode.referenceByFields) {
        if (!this.selectFieldNodes.includes(referenceByFieldNode)) continue
        if (
          referenceByFieldNode.tableNode == this.fromTableNode ||
          this.joinTables.has(referenceByFieldNode.tableNode)
        ) {
          const join: Join = {
            leftFieldNode: referenceBy.fromFieldNode,
            rightFieldNode: referenceBy.toFieldNode,
          }
          this.joinTables.set(selectTableNode, join)
          if (referenceBy.alias) {
            this.addTableAlias(selectTableNode, referenceBy.alias)
          }
          return true
        }
      }

      const referenceTo = selectFieldNode.reference
      if (!referenceTo) return false

      // reference to connected table
      if (
        referenceTo.toFieldNode.tableNode == this.fromTableNode ||
        this.joinTables.has(referenceTo.toFieldNode.tableNode)
      ) {
        const join: Join = {
          leftFieldNode: referenceTo.toFieldNode,
          rightFieldNode: referenceTo.fromFieldNode,
        }
        this.joinTables.set(selectTableNode, join)
        if (referenceTo.alias) {
          this.addTableAlias(
            referenceTo.fromFieldNode.tableNode,
            referenceTo.alias,
          )
        }
        return true
      }

      return false
    }
    addTableAlias(tableNode: Schema.TableNode, alias: string) {
      const aliases = this.tableAliases.get(tableNode)
      if (aliases) {
        aliases.add(alias)
      } else {
        this.tableAliases.set(tableNode, new Set([alias]))
      }
    }
    deduplicateFieldNames() {
      const fieldNodesByName = new Map<string, Set<Schema.FieldNode>>()
      this.selectFieldNodes.forEach(fieldNode => {
        const name = fieldNode.field.name
        const fieldNodes = fieldNodesByName.get(name)
        if (fieldNodes) {
          fieldNodes.add(fieldNode)
        } else {
          fieldNodesByName.set(name, new Set([fieldNode]))
        }
      })
      for (const fieldNodes of fieldNodesByName.values()) {
        if (fieldNodes.size < 2) continue
        fieldNodes.forEach(fieldNode => {
          forEachAlias(
            this.tableAliases.get(fieldNode.tableNode),
            tableAlias => {
              const tableName = tableAlias || fieldNode.tableNode.table.name
              const fieldAlias = tableName + '_' + fieldNode.field.name
              this.fieldAliases.set(fieldNode, fieldAlias)
            },
          )
        })
      }
    }
    makeSelectFields() {
      this.selectFieldNodes.forEach(fieldNode => {
        forEachAlias(this.tableAliases.get(fieldNode.tableNode), tableAlias => {
          this.finalSelectFields.push({
            tableName: tableAlias || fieldNode.tableNode.table.name,
            fieldNode: fieldNode,
            alias: this.fieldAliases.get(fieldNode) || null,
          })
        })
      })
    }
  }
  export class DisconnectedError extends Error {
    constructor(public pendingFieldNodes: Schema.FieldNode[]) {
      super(
        'failed to connect some tables: ' +
          Array.from(
            new Set(
              pendingFieldNodes.map(
                fieldNode => fieldNode.tableNode.table.name,
              ),
            ),
          ).join(', '),
      )
    }
  }
  export interface SelectField {
    tableName: string
    fieldNode: Schema.FieldNode
    alias: string | null
  }

  export interface Join {
    leftFieldNode: Schema.FieldNode
    rightFieldNode: Schema.FieldNode
  }
}

namespace Schema {
  export class Graph {
    private tableNodes: Map<string, TableNode>
    constructor(table_list: Table[]) {
      this.tableNodes = new Map(
        table_list.map(table => [table.name, new TableNode(this, table)]),
      )
      this.tableNodes.forEach(table => table.applyReferences())
    }
    getTable(name: string) {
      const table = this.tableNodes.get(name)
      if (!table) throw new Error(`Table not found, name: "${name}"`)
      return table
    }
  }

  export class TableNode {
    private fieldNodes: Map<string, FieldNode>
    referenceByFields = new Map<FieldNode, Reference>()
    constructor(public graph: Graph, public table: Table) {
      this.fieldNodes = new Map(
        table.field_list.map(field => [
          field.name,
          new FieldNode(graph, this, field),
        ]),
      )
    }
    applyReferences() {
      this.fieldNodes.forEach(field => field.applyReference())
    }
    getField(name: string) {
      const field = this.fieldNodes.get(name)
      if (!field) throw new Error(`Field not found, name: "${name}"`)
      return field
    }
  }

  export class FieldNode {
    reference?: Reference
    constructor(
      public graph: Graph,
      public tableNode: TableNode,
      public field: Field,
    ) {}
    applyReference() {
      const reference = this.field.references
      if (!reference) return
      const refTable = this.graph.getTable(reference.table)
      const refField = refTable.getField(reference.field)
      const alias = this.field.name.replace(/_id$/, '')
      this.reference = {
        fromFieldNode: this,
        toFieldNode: refField,
        alias: alias == refField.tableNode.table.name ? null : alias,
      }
      refTable.referenceByFields.set(this, this.reference)
    }
  }

  export interface Reference {
    fromFieldNode: FieldNode
    toFieldNode: FieldNode
    alias: string | null
  }
}

function forEachAlias(
  aliases: Set<string> | undefined,
  eachFn: (alias: string | null) => void,
) {
  if (!aliases || aliases.size === 0) {
    eachFn(null)
    return
  }
  aliases.forEach(alias => eachFn(alias))
}

function selectToTsType(select: Query.Select): string {
  let tsType = 'export type Row = {'

  select.finalSelectFields.forEach(selectField => {
    const name = selectField.alias || selectField.fieldNode.field.name
    let type = toTsType(selectField.fieldNode.field.type)
    if (selectField.fieldNode.field.is_null) {
      type = 'null | ' + type
    }
    tsType += `\n  ${name}: ${type}`
  })

  tsType += '\n}'
  return tsType
}

function selectToSQL(select: Query.Select): string {
  if (select.finalSelectFields.length === 0) return ''
  let sql = `select`
  select.finalSelectFields.forEach(selectField => {
    sql +=
      '\n, ' + selectField.tableName + '.' + selectField.fieldNode.field.name
    if (selectField.alias) {
      sql += ' as ' + selectField.alias
    }
  })
  // first select column don't need to start with comma
  sql = sql.replace(', ', '  ')
  if (!select.fromTableNode) {
    throw new Error('missing from table')
  }
  sql += '\nfrom ' + select.fromTableNode.table.name
  for (const join of select.joinTables.values()) {
    sql += joinToSQL(select, join)
  }
  return sql
}

function joinToSQL(select: Query.Select, join: Query.Join): string {
  const rightTableNode = join.rightFieldNode.tableNode
  const leftTableNode = join.leftFieldNode.tableNode
  let sql = ''
  forEachAlias(select.tableAliases.get(rightTableNode), rightTableAlias => {
    forEachAlias(select.tableAliases.get(leftTableNode), leftTableAlias => {
      let rightTableName = rightTableNode.table.name
      sql += '\ninner join ' + rightTableName
      if (rightTableAlias) {
        rightTableName = rightTableAlias
        sql += ' as ' + rightTableName
      }
      sql += ' on ' + rightTableName + '.' + join.rightFieldNode.field.name
      const leftTableName = leftTableAlias || leftTableNode.table.name
      sql += ' = ' + leftTableName + '.' + join.leftFieldNode.field.name
    })
  })
  return sql
}
