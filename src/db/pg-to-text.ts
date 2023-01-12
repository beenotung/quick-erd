import { Knex } from 'knex'
import { Table } from '../core/ast'

type ColumnRow = {
  data_type: string
  character_maximum_length: string
}

function toDataType(column_row: ColumnRow): string {
  if (column_row.data_type.match(/character varying/i)) {
    if (column_row.character_maximum_length) {
      return `varchar(${column_row.character_maximum_length})`
    }
    return 'string'
  }
  if (column_row.data_type.match(/character/i)) {
    if (column_row.character_maximum_length) {
      return `char(${column_row.character_maximum_length})`
    }
    return 'string'
  }
  if (column_row.data_type.match(/double precision/i)) {
    return 'double'
  }
  if (column_row.data_type.match(/timestamp/i)) {
    return 'timestamp'
  }
  if (column_row.data_type.match(/time without time zone/i)) {
    return 'time'
  }
  return column_row.data_type
}

function parseEnum(
  column_name: string,
  // e.g. ((status = ANY (ARRAY['active'::text, 'recall'::text])))
  check_clause: string,
): string | null {
  const matches = check_clause
    ?.replace(column_name, 'column_name')
    .match(/\(\(column_name = ANY \(ARRAY\[(.*)\]\)\)\)/)
  if (!matches) return null
  const values: string[] = matches[1].split(',').map(value => {
    value = value.trim()
    value = value.match(/('.*')::text/)?.[1] || value
    return value
  })
  return `enum(${values})`
}

export async function scanPGTableSchema(knex: Knex): Promise<Table[]> {
  const table_list: Table[] = []
  const table_rows = await knex
    .select('tablename')
    .from('pg_tables')
    .where({ schemaname: 'public' })
  for (const table_row of table_rows) {
    const table: Table = {
      name: table_row.tablename,
      field_list: [],
    }
    if (table.name.startsWith('knex_migrations')) {
      continue
    }
    table_list.push(table)
    const result = await knex.raw(
      /* sql */ `
select
  column_name
, data_type
, character_maximum_length
, is_nullable
from information_schema.columns
where table_name = ?
`,
      [table.name],
    )
    const column_rows = result.rows
    for (const column_row of column_rows) {
      /* check foreign key */
      let result = await knex.raw(
        /* sql */
        `
SELECT
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = ?
  AND kcu.column_name = ?
;
`,
        [table.name, column_row.column_name],
      )
      const fk_row = result.rows[0]

      /* check unique */
      result = await knex.raw(
        /* sql */ `
SELECT
    ccu.column_name AS unique_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name = ?
  AND kcu.column_name = ?
;
`,
        [table.name, column_row.column_name],
      )
      const unique_row = result.rows[0]

      let type = toDataType(column_row)

      /* check enum */
      if (type === 'text') {
        result = await knex.raw(
          /* sql */ `
SELECT check_clause
FROM information_schema.check_constraints
WHERE constraint_name = ?
;
`,
          `${table.name}_${column_row.column_name}_check`,
        )
        const check_clause = result.rows[0]?.check_clause
        if (check_clause) {
          type = parseEnum(column_row.column_name, check_clause) || type
        }
      }

      table.field_list.push({
        name: column_row.column_name,
        type,
        is_primary_key:
          column_row.column_name === 'id' &&
          (type === 'integer' || type === 'int'),
        is_null: column_row.is_nullable === 'YES',
        is_unsigned: false,
        is_unique: !!unique_row,
        references: fk_row
          ? {
              type: '>-',
              table: fk_row.foreign_table_name,
              field: fk_row.foreign_column_name,
            }
          : undefined,
      })
    }
  }
  return table_list
}
