import { Field, ParseResult, Table } from './ast'
import { Column } from './query'
import { toTsType } from './ts-type'

export function generateQuery(
  columns: Column[],
  tableList: ParseResult['table_list'],
) {
  const graph = new Schema.Graph(tableList)
  const plan = new Query.Plan(columns, graph)
  return {
    sql: plan.toSQL(),
  }
}

namespace Query {
  export class Plan {
    selectFields: SelectField[] = []
    fromTableNode?: Schema.TableNode
    connectedTables = new Map<string, ConnectedTable>()
    constructor(columns: Column[], public graph: Schema.Graph) {
      columns.forEach(column => {
        this.selectColumn(column)
      })
    }
    selectColumn(column: Column) {
      const field = new SelectField(column, this.graph)
      this.selectFields.push(field)

      const tableNode = this.graph.getTable(column.table)

      if (!this.fromTableNode) {
        this.fromTableNode = tableNode
        this.connectedTables.set(column.table, new ConnectedTable(tableNode))
        return
      }

      if (this.connectedTables.has(column.table)) return
    }
    toSQL(): string {
      let sql = `select`
      this.selectFields.forEach(field => {
        sql +=
          '\n, ' + field.tableNode.table.name + '.' + field.fieldNode.field.name
      })
      // first select column don't need to start with comma
      sql = sql.replace(', ', '  ')
      sql += '\nfrom ' + this.selectFields[0].tableNode.table.name
      return sql
    }
  }
  export class SelectField {
    tableNode: Schema.TableNode
    fieldNode: Schema.FieldNode
    tsType: string
    constructor(column: Column, graph: Schema.Graph) {
      this.tableNode = graph.getTable(column.table)
      this.fieldNode = this.tableNode.getField(column.field)
      this.tsType = toTsType(this.fieldNode.field.type)
      if (this.fieldNode.field.is_null) {
        this.tsType = 'null | ' + this.tsType
      }
    }
  }
  export class ConnectedTable {
    alias?: string
    constructor(public tableNode: Schema.TableNode) {}
  }
}

namespace Schema {
  export class Graph {
    private tableNodes: Map<string, TableNode>
    constructor(table_list: Table[]) {
      this.tableNodes = new Map(
        table_list.map(table => [table.name, new TableNode(table)]),
      )
    }
    getTable(name: string) {
      const table = this.tableNodes.get(name)
      if (!table) throw new Error(`Table not found, name: "${name}"`)
      return table
    }
  }

  export class TableNode {
    private fieldNodes: Map<string, FieldNode>
    constructor(public table: Table) {
      this.fieldNodes = new Map(
        table.field_list.map(field => [field.name, new FieldNode(field, this)]),
      )
    }
    getField(name: string) {
      const field = this.fieldNodes.get(name)
      if (!field) throw new Error(`Field not found, name: "${name}"`)
      return field
    }
  }

  export class FieldNode {
    constructor(public field: Field, public tableNode: TableNode) {}
  }
}
