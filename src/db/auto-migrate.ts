import { closest } from 'fastest-levenshtein'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'fs'
import { Knex as KnexType } from 'knex'
import { basename, dirname, extname, join } from 'path'
import { inspect } from 'util'
import { Field, ParseResult, Table } from '../core/ast'
import { addDependencies, addNpmScripts, writeSrcFile } from '../utils/file'
import { scanMysqlTableSchema } from './mysql-to-text'
import { scanPGTableSchema } from './pg-to-text'
import { sortTables } from './sort-tables'
import { parseTableSchema } from './sqlite-parser'
import {
  toKnexCreateTableCode,
  toKnexCreateColumnCode,
  toKnexCreateColumnTypeCode,
  toKnexDefaultValueCode,
  toKnexNullableCode,
} from './text-to-knex'
import { toSqliteColumnSql } from './text-to-sqlite'

export function detectSrcDir() {
  for (const dir of ['src', 'server']) {
    if (existsSync(dir)) {
      return dir
    }
  }
  return '.'
}

export function setupSqlite(options: { dbFile: string; srcDir: string }) {
  const dbTsFile = join(options.srcDir, 'db.ts')
  if (existsSync(dbTsFile)) {
    return
  }
  addDependencies('better-sqlite3-schema', '^3.1.2')
  addDependencies('@types/integer', '^4.0.1', 'dev')
  addDependencies('better-sqlite3-proxy', '^2.4.1')
  const code = `
import { toSafeMode, newDB, DBInstance } from 'better-sqlite3-schema'

export const dbFile = ${inspect(options.dbFile)}

export const db: DBInstance = newDB({
  path: dbFile,
  migrate: false,
})

toSafeMode(db)
`
  writeSrcFile(dbTsFile, code)
  return
}

export function setupNpmScripts(options: {
  srcDir: string
  db_client: string
  dbFile: string | undefined
}) {
  addDependencies('npm-run-all', '^4.1.5', 'dev')
  const toFile = (filename: string): string => {
    if (options.srcDir == '.') return filename
    return join(options.srcDir, filename)
  }
  if (options.db_client.includes('sqlite')) {
    const proxyFile = toFile('proxy.ts')
    addNpmScripts({
      'db:dev': 'run-s db:update db:plan db:update',
      'db:plan': `auto-migrate ${options.dbFile} < erd.txt`,
      'db:update': `knex migrate:latest && erd-to-proxy < erd.txt > ${proxyFile}`,
    })
  } else {
    const typesFile = toFile('types.ts')
    addNpmScripts({
      'db:dev': 'run-s db:update db:plan db:update',
      'db:plan': `auto-migrate ${options.db_client} < erd.txt`,
      'db:update': `knex migrate:latest && erd-to-types < erd.txt > ${typesFile}`,
    })
  }
}

export function setupGitIgnore(options: { dbFile: string | undefined }) {
  if (!options.dbFile) return
  const dir = dirname(options.dbFile)
  const file = join(dir, '.gitignore')
  let text = (existsSync(file) && readFileSync(file).toString()) || ''
  const originalText = text
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
  const base = basename(options.dbFile)
  if (lines.some(line => line == base + '*')) return
  if (text && !text.endsWith('\n')) {
    text += '\n'
  }
  const files = [base, base + '-shm', base + '-wal']
  for (const file of files) {
    if (!lines.includes(file) && !lines.includes('*' + extname(file))) {
      text += file + '\n'
    }
  }
  if (text != originalText) {
    writeSrcFile(file, text)
  }
}

const defaultPorts: Record<string, number> = {
  mysql: 3306,
  pg: 5432,
  postgresql: 5432,
}

export function setupEnvFile(options: { srcDir: string; db_client: string }) {
  const file = join(options.srcDir, 'env.ts')
  if (existsSync(file)) {
    return
  }
  addDependencies('dotenv', '^16.0.3')
  addDependencies('populate-env', '^2.0.0')
  const code = `
import { config } from 'dotenv'
import populateEnv from 'populate-env'

config()

export const env = {
  DB_HOST: 'localhost',
  DB_PORT: ${defaultPorts[options.db_client] || 0},
  DB_NAME: '',
  DB_USERNAME: '',
  DB_PASSWORD: '',
}

populateEnv(env, { mode: 'halt' })
`
  writeSrcFile(file, code)
}

export function setupKnexFile(options: { srcDir: string; db_client: string }) {
  const { srcDir, db_client } = options
  const file = 'knexfile.ts'
  if (existsSync(file)) {
    return
  }
  addDependencies('knex', '^2.4.2')
  let importDir = srcDir
  if (!importDir.startsWith('.')) {
    importDir = './' + srcDir
  }
  let code: string
  if (db_client.includes('sqlite')) {
    code = `
import type { Knex } from 'knex'
import { dbFile } from '${importDir}/db'

const config: { [key: string]: Knex.Config } = {
  development: {
    client: ${inspect(db_client)},
    useNullAsDefault: true,
    connection: {
      filename: dbFile,
    },
  }
}

module.exports = config;
`
  } else {
    code = `
import type { Knex } from 'knex'
import { env } from '${importDir}/env'

const config: { [key: string]: Knex.Config } = {
  development: {
    client: ${inspect(db_client)},
    connection: {
      database: env.DB_NAME,
      user: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      host: env.DB_HOST,
      port: env.DB_PORT,
      multipleStatements: true,
    },
  }
}

module.exports = config;
`
  }
  writeSrcFile(file, code)
}

const migrations_dir = 'migrations'

function isInternalTable(name: string): boolean {
  switch (name) {
    case 'knex_migrations':
    case 'knex_migrations_lock':
    case 'sqlite_sequence':
      return true
    default:
      return false
  }
}

function diffArray(aArray: string[], bArray: string[]): [string[], string[]] {
  const aSet = new Set(aArray)
  const bSet = new Set(bArray)

  const aDiff: string[] = []
  const bDiff: string[] = []

  for (const a of aSet) {
    if (bSet.has(a)) continue
    aDiff.push(a)
  }

  for (const b of bSet) {
    if (aSet.has(b)) continue
    bDiff.push(b)
  }

  return [aDiff, bDiff]
}

export async function setupKnexMigration(options: {
  knex: KnexType
  db_client: string
  parseResult: ParseResult
  detect_rename: boolean
}) {
  if (!existsSync(migrations_dir)) {
    mkdirSync(migrations_dir)
  }

  const { knex, db_client } = options

  await checkPendingMigrations(knex)

  log('Scanning existing database schema...')
  let existing_table_list: Table[] = await loadTableList(knex, db_client)
  existing_table_list = existing_table_list.filter(
    table => !isInternalTable(table.name),
  )

  const { up_lines, down_lines } = generateAutoMigrate({
    existing_table_list,
    parsed_table_list: options.parseResult.table_list,
    detect_rename: options.detect_rename,
    db_client: options.db_client,
  })

  if (up_lines.length === 0 && down_lines.length === 0) {
    log('No migration is needed.')
  } else {
    const code = `
import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
${up_lines.join('\n')}
}


export async function down(knex: Knex): Promise<void> {
${down_lines.join('\n')}
}
`

    let file = await knex.migrate.make('auto-migrate', { extension: 'ts' })
    file = file.replace(join(process.cwd(), migrations_dir), migrations_dir)
    writeSrcFile(file, code)
  }

  await knex.destroy()
}

export function generateAutoMigrate(options: {
  existing_table_list: Table[]
  parsed_table_list: Table[]
  detect_rename: boolean
  db_client: string
}) {
  const is_sqlite = options.db_client.includes('sqlite')
  const up_lines: string[] = []
  const down_lines: string[] = []

  const renamed_tables: string[] = []

  // detect deleted tables
  const [diff_existing_table_names, diff_parsed_table_names] = diffArray(
    options.existing_table_list.map(table => table.name),
    options.parsed_table_list.map(table => table.name),
  )
  for (let i = 0; i < diff_existing_table_names.length; i++) {
    const existing_table_name = diff_existing_table_names[i]
    const existing_table = options.existing_table_list.find(
      table => table.name === existing_table_name,
    )
    if (!existing_table) continue

    // detect rename table
    if (
      options.detect_rename &&
      options.existing_table_list.length === options.parsed_table_list.length
    ) {
      const parsed_table_name = closest(
        existing_table_name,
        diff_parsed_table_names,
      )
      const parsed_table = options.parsed_table_list.find(
        table => table.name === parsed_table_name,
      )
      if (!parsed_table) continue

      up_lines.push(
        `  await knex.schema.renameTable('${existing_table_name}', '${parsed_table_name}')`,
      )
      down_lines.push(
        `  await knex.schema.renameTable('${parsed_table_name}', '${existing_table_name}')`,
      )

      renamed_tables.push(parsed_table_name)

      // remove matched pair
      diff_existing_table_names.splice(i, 1)
      i--
      const idx = diff_parsed_table_names.indexOf(parsed_table_name)
      diff_parsed_table_names.splice(idx, 1)

      continue
    }

    // detected deleted table
    up_lines.push(
      `  await knex.schema.dropTableIfExists('${existing_table_name}')`,
    )
    down_lines.push(toKnexCreateTableCode(existing_table))
  }

  // detect new / modified tables
  sortTables(options.parsed_table_list).forEach(table => {
    const { name, field_list } = table
    const existing_table = options.existing_table_list.find(
      table => table.name === name,
    )
    if (!existing_table) {
      if (renamed_tables.includes(name)) return
      up_lines.push(toKnexCreateTableCode(table))
      down_lines.unshift(`  await knex.schema.dropTableIfExists('${name}')`)
      return
    }
    const table_up_lines: string[] = []
    const table_down_lines: string[] = []
    const raw_up_lines: string[] = []
    const raw_down_lines: string[] = []
    const new_columns: Field[] = []
    const removed_columns: Field[] = []
    function compareColumn(field: Field, existing_field: Field) {
      // avoid non-effective migration
      // don't distinct datetime timestamp
      // knex translates 'timestamp' into 'datetime' for sqlite db when running schema query builder
      if (
        (field.type === 'datetime' && existing_field.type == 'timestamp') ||
        (existing_field.type === 'datetime' && field.type == 'timestamp')
      ) {
        field.type = existing_field.type
      }

      if (
        field.type !== existing_field.type ||
        field.is_unsigned !== existing_field.is_unsigned
      ) {
        if (
          is_sqlite &&
          field.type.match(/^enum/i) &&
          existing_field.type.match(/^enum/i)
        ) {
          raw_up_lines.push(alterSqliteEnum(table, field))
          raw_down_lines.unshift(alterSqliteEnum(table, existing_field))
        } else if (is_sqlite) {
          raw_up_lines.push(alterSqliteType(table, field))
          raw_down_lines.unshift(alterSqliteType(table, existing_field))
        } else {
          table_up_lines.push(alterType(field))
          table_down_lines.unshift(alterType(existing_field))
        }
      }

      if (field.is_primary_key !== existing_field.is_primary_key) {
        table_up_lines.push(alterPrimaryKey(field))
        table_down_lines.unshift(alterPrimaryKey(existing_field))
      }

      if (field.is_unique !== existing_field.is_unique) {
        table_up_lines.push(alterUnique(field))
        table_down_lines.unshift(alterUnique(existing_field))
      }

      if (field.is_null !== existing_field.is_null) {
        if (is_sqlite) {
          raw_up_lines.push(alterSqliteNullable(table, field))
          raw_down_lines.unshift(alterSqliteNullable(table, existing_field))
        } else {
          table_up_lines.push(alterNullable(field))
          table_down_lines.unshift(alterNullable(existing_field))
        }
      }

      // add foreign key
      if (field.references && !existing_field.references) {
        table_up_lines.push(addForeignKey(field))
        table_down_lines.unshift(dropForeignKey(field))
      }
      // drop foreign key
      else if (!field.references && existing_field.references) {
        table_up_lines.push(dropForeignKey(existing_field))
        table_down_lines.unshift(addForeignKey(existing_field))
      }
      // change foreign key
      else if (
        field.references &&
        existing_field.references &&
        (field.references.table !== existing_field.references.table ||
          field.references.field !== existing_field.references.field)
      ) {
        table_up_lines.push(dropForeignKey(existing_field))
        table_down_lines.unshift(addForeignKey(existing_field))
        table_up_lines.push(addForeignKey(field))
        table_down_lines.unshift(dropForeignKey(field))
      }
    }
    field_list.forEach(field => {
      const { name } = field
      const existing_field = existing_table.field_list.find(
        field => field.name === name,
      )

      // detect new columns
      if (!existing_field) {
        new_columns.push(field)
        return
      }
      compareColumn(field, existing_field)
    })

    // detected removed columns
    existing_table.field_list.forEach(existing_field => {
      const { name } = existing_field
      if (
        name === 'created_at' ||
        name === 'updated_at' ||
        table.field_list.some(field => field.name === name)
      ) {
        return
      }
      removed_columns.push(existing_field)
    })

    // detect renamed fields
    if (
      options.detect_rename &&
      new_columns.length === removed_columns.length
    ) {
      for (let i = 0; i < new_columns.length; i++) {
        const field = new_columns[i]
        const new_field_name = field.name
        const existing_field_name = closest(
          field.name,
          removed_columns.map(existing_field => existing_field.name),
        )
        const j = removed_columns.findIndex(
          existing_field => existing_field.name === existing_field_name,
        )
        const existing_field = removed_columns[j]

        compareColumn({ ...field, name: existing_field_name }, existing_field)

        table_up_lines.push(renameColumn(existing_field_name, new_field_name))
        table_down_lines.unshift(
          renameColumn(new_field_name, existing_field_name),
        )

        new_columns.splice(i, 1)
        removed_columns.splice(j, 1)
        i--
      }
    }

    function addDropColumn(
      field: Field,
      options: {
        table_add_lines: string[]
        table_drop_lines: string[]
        raw_add_lines: string[]
        raw_drop_lines: string[]
      },
    ) {
      if (is_sqlite) {
        /* sqlite version */
        const table = wrapSqliteName(name)
        const col = wrapSqliteName(field.name)

        const { references, is_unique } = field
        const quoted_field = { ...field, name: col, is_unique: false }

        if (references) {
          quoted_field.references = {
            type: references.type,
            table: wrapSqliteName(references.table),
            field: wrapSqliteName(references.field),
          }
        }

        const body = toSqliteColumnSql(quoted_field)
        options.raw_add_lines.push(
          `  await knex.raw(${inspect(
            `alter table ${table} add column ${body}`,
          )})`,
        )
        options.raw_drop_lines.unshift(
          `  await knex.raw(${inspect(
            `alter table ${table} drop column ${col}`,
          )})`,
        )

        if (is_unique) {
          options.raw_add_lines.push(
            `  await knex.schema.alterTable(${table}, table => table.unique([${col}]))`,
          )
          options.raw_drop_lines.unshift(
            `  await knex.schema.alterTable(${table}, table => table.dropUnique([${col}]))`,
          )
        }
      } else {
        /* knex version */
        const name = inspect(field.name)
        options.table_add_lines.push(toKnexCreateColumnCode(field))
        options.table_drop_lines.unshift(`table.dropColumn(${name})`)
      }
    }

    // add new columns
    new_columns.forEach(field => {
      addDropColumn(field, {
        table_add_lines: table_up_lines,
        table_drop_lines: table_down_lines,
        raw_add_lines: raw_up_lines,
        raw_drop_lines: raw_down_lines,
      })
    })

    // drop removed columns
    removed_columns.forEach(existing_field => {
      addDropColumn(existing_field, {
        table_drop_lines: table_up_lines,
        table_add_lines: table_down_lines,
        raw_drop_lines: raw_up_lines,
        raw_add_lines: raw_down_lines,
      })
    })

    function mergeLines(lines: string[]): string {
      return lines
        .map(line => '    ' + line.trim())
        .join('\n')
        .replace(/\n\n/g, '\n')
    }

    if (table_up_lines.length > 0) {
      up_lines.push(
        `  await knex.schema.alterTable('${name}', table => {
${mergeLines(table_up_lines)}
  })`,
      )
    }
    up_lines.push(...raw_up_lines)

    if (table_down_lines.length > 0) {
      down_lines.unshift(
        `  await knex.schema.alterTable('${name}', table => {
${mergeLines(table_down_lines)}
  })`,
      )
    }
    down_lines.unshift(...raw_down_lines)
  })

  return { up_lines, down_lines }
}

function alterSqliteField(
  table: Table,
  field: Field,
  columnDefinition: string,
): string {
  if (!field.is_null) {
    throw new Error(
      `alter non-nullable column (${table.name}.${field.name}) is not supported in sqlite`,
    )
  }
  let drop_lines = ''
  let add_lines = ''
  if (field.is_unique) {
    drop_lines += `
    await knex.schema.alterTable('${table.name}', table => table.dropUnique(['${field.name}']))`
    add_lines += `
    await knex.schema.alterTable('${table.name}', table => table.unique(['${field.name}']))`
  }
  if (field.references) {
    drop_lines += `
    await knex.schema.alterTable('${table.name}', table => table.dropForeign(['${field.name}']))`
  }
  const code = `
  {
    const rows = await knex.select('id', '${field.name}').from('${table.name}')${drop_lines}
    await knex.raw('alter table \`${table.name}\` drop column \`${field.name}\`')
    await knex.raw("alter table \`${table.name}\` add column ${columnDefinition}")${add_lines}
    for (let row of rows) {
      await knex('${table.name}').update({ ${field.name}: row.${field.name} }).where({ id: row.id })
    }
  }`
  return '  ' + code.trim()
}
function alterSqliteType(table: Table, field: Field): string {
  const col = wrapSqliteName(field.name)
  const quoted_field = { ...field, name: col }
  quoted_field.is_unique = false
  const body = toSqliteColumnSql(quoted_field)
  return alterSqliteField(table, field, body)
}
function alterSqliteEnum(table: Table, field: Field): string {
  const col = wrapSqliteName(field.name)
  const values = field.type.replace(/enum/i, '')
  const columnDefinition = `${col} text check (${col} in ${values})`
  return alterSqliteField(table, field, columnDefinition)
}
function alterSqliteNullable(table: Table, field: Field): string {
  if (!field.is_null) {
    const code = `
  // FIXME: alter column (${table.name}.${field.name}) to be non-nullable not supported in sqlite
  // you may set it to be non-nullable with sqlite browser manually
`
    return '  ' + code.trim()
  }
  return alterSqliteType(table, field)
}
function alterType(field: Field): string {
  let code = 'table'
  code += toKnexCreateColumnTypeCode(field)
  code += toKnexNullableCode(field)
  code += toKnexDefaultValueCode(field)
  code += '.alter()'
  return code
}
function alterPrimaryKey(field: Field): string {
  if (field.is_unique) {
    return `table.primary([${inspect(field.name)}])`
  } else {
    return `table.dropPrimary([${inspect(field.name)}])`
  }
}
function alterUnique(field: Field): string {
  if (field.is_unique) {
    return `table.unique([${inspect(field.name)}])`
  } else {
    return `table.dropUnique([${inspect(field.name)}])`
  }
}
function alterNullable(field: Field): string {
  if (field.is_null) {
    return `table.setNullable(${inspect(field.name)})`
  } else {
    return `table.dropNullable(${inspect(field.name)})`
  }
}
function addForeignKey(field: Field): string {
  if (!field.references) {
    return ''
  }
  return `table.foreign(${inspect(field.name)}).references(${inspect(
    field.references.table + '.' + field.references.field,
  )})`
}
function dropForeignKey(field: Field): string {
  return `table.dropForeign(${inspect(field.name)})`
}
function renameColumn(from: string, to: string): string {
  return `table.renameColumn(${inspect(from)}, ${inspect(to)})`
}

async function loadTableList(
  knex: KnexType,
  db_client: string,
): Promise<Table[]> {
  if (db_client.includes('sqlite')) {
    const rows: Array<{ name: string; sql: string; type: string }> =
      await knex.raw(/* sql */ `select name, sql, type from sqlite_master`)
    return parseTableSchema(rows)
  }

  if (db_client === 'pg' || db_client.includes('postgres')) {
    return await scanPGTableSchema(knex)
  }

  if (db_client.includes('mysql')) {
    return await scanMysqlTableSchema(knex)
  }

  throw new Error('unknown db_client: ' + db_client)
}

async function checkPendingMigrations(knex: KnexType) {
  const files = readdirSync(migrations_dir)
  if (files.length === 0) {
    return
  }
  const status = await knex.migrate.status().catch(async e => {
    const hasTable = await knex.schema.hasTable('knex_migrations')
    if (!hasTable) {
      return -files.length
    }
    throw e
  })
  if (status === 0) {
    return
  }

  console.error('Error: not migrated to latest version.')
  console.error(
    "Please run 'npx knex migrate:latest' first, then re-run this auto-migrate command.",
  )
  process.exit(1)
}

const log = console.error.bind(console)

const quotes = ['"', "'", '`']
function wrapSqliteName(name: string) {
  for (const quote of quotes) {
    if (name.startsWith(quote) && name.endsWith(quote)) {
      name = name.slice(1, name.length - 1)
      break
    }
  }
  return '`' + name + '`'
}
