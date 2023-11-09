import { Knex } from 'knex'
import { Table } from '../core/ast'

export async function scanMssqlTableSchema(knex: Knex): Promise<Table[]> {
  const table_list: Table[] = []
  let table_rows = await knex
    .select('table_name')
    .from('information_schema.tables')
    .where({ table_type: 'BASE TABLE' })
  for (let table_row of table_rows) {
    const table: Table = {
      name: table_row.table_name,
      field_list: [],
    }
    if (table.name.startsWith('knex_migrations')) {
      continue
    }
    table_list.push(table)

    let result = await knex.raw(
      /* sql */ `
select
  column_name
, ordinal_position
, column_default
, is_nullable
, data_type
, character_maximum_length
, numeric_precision
, numeric_scale
from information_schema.columns
where table_name = ?
`,
      [table.name],
    )
    for (let column of result) {
      let type = column.data_type

      /* check foreign key */
      result = await knex.raw(
        /* sql */ `
select
  object_name (fkeys.referenced_object_id) foreign_table_name
, col_name(fkeys.referenced_object_id, fkeys.referenced_column_id) foreign_column_name
from sys.foreign_key_columns as fkeys
where object_name(fkeys.parent_object_id) = ?
  and col_name(fkeys.parent_object_id, fkeys.parent_column_id) = ?
`,
        [table.name, column.column_name],
      )
      const fk_row = result[0]

      /* check primary key */
      result = await knex.raw(
        /* sql */ `
select
  k.constraint_name
from information_schema.table_constraints as c
join information_schema.key_column_usage as k
 on c.table_name = k.table_name
and c.constraint_catalog = k.constraint_catalog
and c.constraint_schema = k.constraint_schema
and c.constraint_name = k.constraint_name
where c.constraint_type = 'PRIMARY KEY'
  and k.table_name = ?
  and k.column_name = ?
`,
        [table.name, column.column_name],
      )
      const pk_row = result[0]

      /* check unique */
      result = await knex.raw(
        /* sql */ `
select
  i.name as index_name
from sys.objects t
inner join sys.indexes i on t.object_id = i.object_id
cross apply (
  select col.[name] + ', '
  from sys.index_columns ic
  inner join sys.columns col
     on ic.object_id = col.object_id
    and ic.column_id = col.column_id
  where ic.object_id = t.object_id
    and ic.index_id = i.index_id
  order by key_ordinal
  for xml path ('')
) D (column_name_)
where t.is_ms_shipped <> 1
  and t.type = 'U' -- U for table, V for view
  and i.is_unique = 1
  and t.name = ?
  and substring(column_name_, 1, len(column_name_)-1) = ?
order by i.[name]
`,
        [table.name, column.column_name],
      )
      const unique_row = result[0]

      // TODO
      /* check enum */
      result = await knex.raw(
        /* sql */ `
select
  con.[name] as constraint_name
  -- e.g. "([status]='pending' OR [status]='active')"
, con.definition as constraint_definition
from sys.check_constraints con
left outer join sys.objects t
  on con.parent_object_id = t.object_id
left outer join sys.all_columns col
  on con.parent_column_id = col.column_id
 and con.parent_object_id = col.object_id
where con.is_disabled = 0
  and t.name = ?
  and col.name = ?
`,
        [table.name, column.column_name],
      )
      for (let row of result) {
        let text = row.constraint_definition as string
        let match = text.match(/=([\w'"]+)/g)
        if (!match) continue
        let values = match.map(text => text.slice(1))
        type = `enum(${values.join(',')})`
      }

      table.field_list.push({
        name: column.column_name,
        type: toDataType(type, column),
        is_primary_key: !!pk_row,
        is_null: column.is_nullable == 'YES',
        is_unsigned: false,
        is_unique: !pk_row && !!unique_row,
        references: fk_row
          ? {
              type: '>-',
              table: fk_row.foreign_table_name,
              field: fk_row.foreign_column_name,
            }
          : undefined,
        default_value: column.column_default || undefined,
      })
    }
  }

  return table_list
}

function toDataType(
  type: string,
  column: { character_maximum_length: number },
): string {
  if (type.includes('varchar')) {
    return column.character_maximum_length == -1
      ? 'text'
      : `varchar(${column.character_maximum_length})`
  }
  if (type.includes('datetime2')) {
    return 'timestamp'
  }
  return type
}
