import { Knex } from 'knex'
import { Table } from '../core/ast'
import { parseCreateTable } from './mysql-parser'

export async function scanMysqlTableSchema(knex: Knex): Promise<Table[]> {
  const table_list: Table[] = []

  const [rows, fields] = await knex.raw(`show tables`)
  const name = fields[0].name
  for (const row of rows) {
    const table = row[name]
    const result = await knex.raw(`show create table \`${table}\``)
    const sql: string = result[0][0]['Create Table']
    const field_list = parseCreateTable(sql)
    table_list.push({ name: table, field_list })
  }

  return table_list
}
