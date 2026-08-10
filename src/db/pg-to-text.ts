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

export function parseEnum(
  column_name: string,
  // knex/pg versions may wrap with one or two parentheses, e.g.
  // (status = ANY (ARRAY['active'::text, 'recall'::text]))
  // ((status = ANY (ARRAY['active'::text, 'recall'::text])))
  check_clause: string,
): string | null {
  const normalized = check_clause?.replace(column_name, 'column_name')
  // handle both single-bracket and double-bracket wrappers
  const matches =
    normalized?.match(/\(column_name = ANY \(ARRAY\[(.*)\]\)\)/) ||
    normalized?.match(/\(\(column_name = ANY \(ARRAY\[(.*)\]\)\)\)/)
  if (!matches) return null
  const values: string[] = matches[1].split(',').map(value => {
    value = value.trim()
    value = value.match(/('.*')::text/)?.[1] || value
    return value
  })
  return `enum(${values.join(',')})`
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
      unique_field_lists: [],
      index_field_lists: [],
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

      /* check primary key */
      result = await knex.raw(
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
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_name = ?
  AND kcu.column_name = ?
;
`,
        [table.name, column_row.column_name],
      )
      const pk_row = result.rows[0]

      /* check unique (single-column only; multi-column goes to unique_field_lists) */
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
  AND (
    SELECT count(*)
    FROM information_schema.key_column_usage AS kcu2
    WHERE kcu2.constraint_name = tc.constraint_name
      AND kcu2.table_schema = tc.table_schema
      AND kcu2.table_name = tc.table_name
  ) = 1
;
`,
        [table.name, column_row.column_name],
      )
      let unique_row = result.rows[0]

      /* check single-column unique index (CREATE UNIQUE INDEX, not a table constraint) */
      if (!unique_row) {
        result = await knex.raw(
          /* sql */ `
SELECT
    ic.relname AS index_name
FROM pg_index i
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_class ic ON ic.oid = i.indexrelid
JOIN pg_attribute a
  ON a.attrelid = i.indrelid
 AND a.attnum = i.indkey[0]
WHERE n.nspname = 'public'
  AND t.relname = ?
  AND a.attname = ?
  AND i.indisunique
  AND NOT i.indisprimary
  AND i.indnkeyatts = 1
LIMIT 1
;
`,
          [table.name, column_row.column_name],
        )
        unique_row = result.rows[0]
      }

      /* check index */
      result = await knex.raw(
        /* sql */ `
SELECT
    ic.relname AS index_name
FROM pg_index i
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_class ic ON ic.oid = i.indexrelid
JOIN pg_attribute a
  ON a.attrelid = i.indrelid
 AND a.attnum = ANY (i.indkey)
WHERE n.nspname = 'public'
  AND t.relname = ?
  AND a.attname = ?
  AND NOT i.indisprimary
  AND NOT i.indisunique
LIMIT 1
;
`,
        [table.name, column_row.column_name],
      )
      const index_row = result.rows[0]

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
          [`${table.name}_${column_row.column_name}_check`],
        )
        const check_clause = result.rows[0]?.check_clause
        if (check_clause) {
          type = parseEnum(column_row.column_name, check_clause) || type
        }
      }

      /* check default value */
      result = await knex.raw(
        /* sql */ `
SELECT column_default
FROM information_schema.columns
WHERE table_name = ?
  AND column_name = ?
;
`,
        [table.name, column_row.column_name],
      )
      const default_value = result.rows[0].column_default

      table.field_list.push({
        name: column_row.column_name,
        type,
        is_primary_key: !!pk_row,
        is_null: column_row.is_nullable === 'YES',
        is_unsigned: false,
        is_zerofill: false,
        is_unique: !!unique_row,
        is_index: !!index_row,
        references: fk_row
          ? {
              type: '>0-',
              table: fk_row.foreign_table_name,
              field: fk_row.foreign_column_name,
            }
          : undefined,
        default_value,
        collate: undefined,
      })
    }

    /* check multi-column unique constraints */
    const uniqueResult = await knex.raw(
      /* sql */ `
SELECT
    tc.constraint_name,
    array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS column_names
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name = ?
GROUP BY tc.constraint_name
HAVING count(*) > 1
;
`,
      [table.name],
    )
    for (const row of uniqueResult.rows) {
      table.unique_field_lists.push(toColumnList(row.column_names))
    }

    /* check multi-column unique indexes (CREATE UNIQUE INDEX, not a table constraint) */
    const uniqueIndexResult = await knex.raw(
      /* sql */ `
SELECT
    ic.relname AS index_name,
    array_agg(a.attname ORDER BY k.ordinality) AS column_names
FROM pg_index i
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_class ic ON ic.oid = i.indexrelid
JOIN LATERAL unnest(i.indkey::smallint[]) WITH ORDINALITY AS k(attnum, ordinality) ON true
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
WHERE n.nspname = 'public'
  AND t.relname = ?
  AND i.indisunique
  AND NOT i.indisprimary
  AND i.indnkeyatts > 1
  AND k.ordinality <= i.indnkeyatts
GROUP BY ic.relname
;
`,
      [table.name],
    )
    for (const row of uniqueIndexResult.rows) {
      table.unique_field_lists.push(toColumnList(row.column_names))
    }
    table.unique_field_lists = dedupeLists(table.unique_field_lists)

    /* check multi-column indexes */
    const indexResult = await knex.raw(
      /* sql */ `
SELECT
    ic.relname AS index_name,
    array_agg(a.attname ORDER BY k.ordinality) AS column_names
FROM pg_index i
JOIN pg_class t ON t.oid = i.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_class ic ON ic.oid = i.indexrelid
JOIN LATERAL unnest(i.indkey::smallint[]) WITH ORDINALITY AS k(attnum, ordinality) ON true
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
WHERE n.nspname = 'public'
  AND t.relname = ?
  AND NOT i.indisprimary
  AND NOT i.indisunique
  AND i.indnkeyatts > 1
  AND k.ordinality <= i.indnkeyatts
GROUP BY ic.relname
;
`,
      [table.name],
    )
    for (const row of indexResult.rows) {
      table.index_field_lists.push(toColumnList(row.column_names))
    }
  }
  return table_list
}

function toColumnList(columnNames: string[] | string): string[] {
  if (Array.isArray(columnNames)) return columnNames
  const inner = columnNames.slice(1, -1)
  if (!inner) return []
  return inner.split(',').map(name => name.trim())
}

function dedupeLists(lists: string[][]): string[][] {
  const seen = new Set<string>()
  const result: string[][] = []
  for (const list of lists) {
    const key = list.join('\u0000')
    if (seen.has(key)) continue
    seen.add(key)
    result.push(list)
  }
  return result
}
