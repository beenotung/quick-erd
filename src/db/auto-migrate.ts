import { closest } from 'fastest-levenshtein'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs'
import { Knex as KnexType } from 'knex'
import { dirname, join } from 'path'
import { inspect } from 'util'
import { Field, ParseResult, Table } from '../core/ast'
import {
  addDependencies,
  addGitIgnore,
  addNpmScripts,
  PackageJSON,
  readNpmScripts,
  readPackageJSON,
  writeSrcFile,
} from '../utils/file'
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
import { scanMssqlTableSchema } from './mssql-to-text'
import { parseEnumValues } from '../core/enum'
import { isInternalTable } from '../core/table'

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
  addDependencies('@types/better-sqlite3', '^7.6.13', 'dev')
  addDependencies('@types/integer', '^4.0.3', 'dev')
  addDependencies('better-sqlite3', '^11.9.1')
  addDependencies('better-sqlite3-schema', '^3.1.7')
  addDependencies('better-sqlite3-proxy', '^2.10.1')
  const code = `
import { toSafeMode, newDB, DBInstance } from 'better-sqlite3-schema'
import { basename, join } from 'path'

function resolveFile(file: string) {
  return basename(process.cwd()) == 'dist' ? join('..', file) : file
}

export const dbFile = resolveFile(${inspect(options.dbFile)})

export const db: DBInstance = newDB({
  path: dbFile,
  migrate: false,
})

toSafeMode(db)
`
  writeSrcFile(dbTsFile, code)
  return
}

export function setupTypescript() {
  addDependencies('typescript', '^5.8.3', 'dev')
  addDependencies('ts-node', '^10.9.2', 'dev')
  addDependencies('@types/node', '^22.14.1', 'dev')
  setupTsConfigFile()
}

export function setupPnpm() {
  let file = 'package.json'
  let text = readFileSync(file).toString()
  let pkg: PackageJSON = JSON.parse(text)
  pkg.pnpm ||= {}
  pkg.pnpm.onlyBuiltDependencies ||= []
  let deps = ['better-sqlite3', 'esbuild']
  let changed = false
  for (let dep of deps) {
    if (text.includes(dep) && !pkg.pnpm.onlyBuiltDependencies.includes(dep)) {
      pkg.pnpm.onlyBuiltDependencies.push(dep)
      changed = true
    }
  }
  if (changed) {
    text = JSON.stringify(pkg, null, 2)
    writeSrcFile(file, text)
  }
}

function setupTsConfigFile() {
  const file = 'tsconfig.json'
  if (existsSync(file)) return
  const config = {
    compilerOptions: {
      target: 'es2022',
      module: 'commonjs',
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      skipLibCheck: true,
      incremental: true,
      outDir: 'dist',
    },
    exclude: ['dist'],
  }
  const text = JSON.stringify(config, null, 2)
  writeSrcFile(file, text)
}

export function setupNpmScripts(options: {
  srcDir: string
  db_client: string
  dbFile: string | undefined
}) {
  const scripts = readNpmScripts()
  function hasScript(pattern: string): boolean {
    return Object.values(scripts).some(script => script.includes(pattern))
  }
  if (
    hasScript('auto-migrate') &&
    (hasScript('erd-to-proxy') || hasScript('erd-to-types'))
  ) {
    return
  }
  addDependencies('npm-run-all', '^4.1.5', 'dev')
  const toFile = (filename: string): string => {
    if (options.srcDir == '.') return filename
    return join(options.srcDir, filename)
  }

  const newScripts: Record<string, string> = {
    'db:ui': 'erd-ui erd.txt',
    'db:setup': 'npm run db:migrate',
    'db:dev': 'run-s db:migrate db:plan db:update',
    'db:migrate': 'knex migrate:latest',
  }

  let seed = 'db:seed' in scripts ? 'db:seed' : 'seed' in scripts ? 'seed' : ''
  if (!seed && existsSync('seed.ts')) {
    seed = 'db:seed'
    newScripts[seed] = 'ts-node seed.ts'
  } else if (!seed && existsSync('seed')) {
    seed = 'db:seed'
    newScripts[seed] = 'knex seed:run'
  }
  if (seed) {
    newScripts['db:setup'] = 'run-s db:migrate ' + seed
  }

  if (options.db_client.includes('sqlite')) {
    const proxyFile = toFile('proxy.ts')
    newScripts['db:plan'] = `auto-migrate ${options.dbFile} < erd.txt`
    newScripts['db:rename'] =
      `auto-migrate --rename ${options.dbFile} < erd.txt`
    newScripts['db:update'] = `run-s db:migrate db:gen-proxy`
    newScripts['db:gen-proxy'] = `erd-to-proxy < erd.txt > ${proxyFile}`
  } else {
    const typesFile = toFile('types.ts')
    newScripts['db:plan'] = `auto-migrate ${options.db_client} < erd.txt`
    newScripts['db:rename'] =
      `auto-migrate --rename ${options.db_client} < erd.txt`
    newScripts['db:update'] = `run-s db:migrate db:gen-types`
    newScripts['db:gen-types'] = `erd-to-types < erd.txt > ${typesFile}`
  }

  addNpmScripts(newScripts)
}

export function setupGitIgnore(options: { dbFile: string | undefined }) {
  addGitIgnore('.gitignore', [
    'node_modules',
    '*.tgz',
    'dist',
    '.env',
    '.env.*',
    '!.env.example',
  ])
  if (options.dbFile) {
    const dir = dirname(options.dbFile)
    const file = join(dir, '.gitignore')
    addGitIgnore(file, [
      '*.sqlite3',
      '*.sqlite3-shm',
      '*.sqlite3-wal',
      'dump.sql',
      '*.xz',
    ])
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
  addDependencies('dotenv', '^16.5.0')
  addDependencies('populate-env', '^2.3.1')
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

export function setupKnexTsFile(options: { srcDir: string }) {
  const file = join(options.srcDir, 'knex.ts')
  if (existsSync(file)) {
    return
  }
  let importDir = options.srcDir
    .split('/')
    .map(part => (part == '.' ? part : '..'))
    .join('/')
  let code = `
import Knex from 'knex'

/* eslint-disable @typescript-eslint/no-var-requires */
let configs = require('${importDir}/knexfile')

export const knex = Knex(configs.development)
`
  writeSrcFile(file, code)
}

export function setupKnexFile(options: { srcDir: string; db_client: string }) {
  const { srcDir, db_client } = options
  const file = 'knexfile.ts'
  if (existsSync(file)) {
    return
  }
  addDependencies('knex', '^3.1.0')
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
import { Knex } from 'knex'

// prettier-ignore
export async function up(knex: Knex): Promise<void> {
${up_lines.join('\n')}
}

// prettier-ignore
export async function down(knex: Knex): Promise<void> {
${down_lines.join('\n')}
}
`.replaceAll('{\n\n', '{\n')

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
  const { db_client } = options
  const is_sqlite = db_client.includes('sqlite')
  const is_postgres = db_client.includes('postgres') || db_client == 'pg'
  const up_lines: string[] = []
  const down_lines: string[] = []

  const tailing_up_lines: string[] = []
  const leading_down_lines: string[] = []

  const renamed_tables: string[] = []

  // detect renamed / deleted tables
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
    tailing_up_lines.push(
      `  await knex.schema.dropTableIfExists('${existing_table_name}')`,
    )
    leading_down_lines.unshift(toKnexCreateTableCode(existing_table, db_client))
  }

  // detect new / modified tables
  sortTables(options.parsed_table_list).forEach(table => {
    const { name, field_list } = table
    const existing_table = options.existing_table_list.find(
      table => table.name === name,
    )
    if (!existing_table) {
      if (renamed_tables.includes(name)) return
      up_lines.push(toKnexCreateTableCode(table, db_client))
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
      // don't distinct datetime and timestamp
      // knex translates 'timestamp' into 'datetime' for sqlite db when running schema query builder
      if (
        is_sqlite &&
        ((field.type === 'datetime' && existing_field.type == 'timestamp') ||
          (existing_field.type === 'datetime' && field.type == 'timestamp'))
      ) {
        field.type = existing_field.type
      }

      // avoid non-effective migration
      // don't distinct int and integer
      // don't distinct int(10) and integer
      if (
        is_sqlite &&
        (((field.type === 'int' || field.type.startsWith('int(')) &&
          existing_field.type == 'integer') ||
          ((existing_field.type === 'int' ||
            existing_field.type.startsWith('int(')) &&
            field.type == 'integer'))
      ) {
        field.type = existing_field.type
      }

      // avoid non-effective migration
      // don't distinct enum values ordering
      if (
        field.type.match(/^enum/i) &&
        existing_field.type.match(/^enum/i) &&
        parseEnumValues(field.type).sort().join() ==
          parseEnumValues(existing_field.type).sort().join()
      ) {
        field.type = existing_field.type
      }

      // avoid non-effective migration
      // don't distinct signed and unsigned in postgres
      if (is_postgres || is_sqlite) {
        field.is_unsigned = existing_field.is_unsigned
      }

      // avoid non-effective migration
      // don't distinct varchar and nvarchar in sqlite
      if (is_sqlite && field.type != existing_field.type) {
        if (
          field.type.startsWith('nvarchar') &&
          existing_field.type.startsWith('varchar')
        ) {
          field.type = field.type.slice(1)
        } else if (
          field.type.startsWith('varchar') &&
          existing_field.type.startsWith('nvarchar')
        ) {
          existing_field.type = existing_field.type.slice(1)
        }
      }

      if (
        field.type !== existing_field.type ||
        field.is_unsigned !== existing_field.is_unsigned
      ) {
        const is_both_enum =
          field.type.match(/^enum/i) && existing_field.type.match(/^enum/i)

        if (is_sqlite && is_both_enum) {
          raw_up_lines.push(alterSqliteEnum(table, field))
          raw_down_lines.unshift(alterSqliteEnum(table, existing_field))
        }
        if (is_postgres && is_both_enum) {
          table_up_lines.push(...alterPostgresEnum(table, field))
          table_down_lines.unshift(...alterPostgresEnum(table, existing_field))
        } else if (is_sqlite) {
          raw_up_lines.push(alterSqliteType(table, field))
          raw_down_lines.unshift(alterSqliteType(table, existing_field))
        } else {
          table_up_lines.push(alterType(field, db_client))
          table_down_lines.unshift(alterType(existing_field, db_client))
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
          raw_up_lines.push(
            alterSqliteNullable(options.parsed_table_list, table.name, field),
          )
          raw_down_lines.unshift(
            alterSqliteNullable(
              options.existing_table_list,
              table.name,
              existing_field,
            ),
          )
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
          references || field.is_unique
            ? `  await knex.schema.alterTable(${table}, table => table.dropColumn(${col}))`
            : `  await knex.raw(${inspect(
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
        options.table_add_lines.push(toKnexCreateColumnCode(field, db_client))
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

  up_lines.push(...tailing_up_lines)
  down_lines.unshift(...leading_down_lines)

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
function alterSqliteNullable(
  allTables: Table[],
  tableName: string,
  field: Field,
): string {
  const db_client = 'better-sqlite3'

  const table = allTables.find(table => table.name == tableName)
  if (!table) {
    throw new Error('table not found, name: ' + tableName)
  }

  const involvedTables: Table[] = [table]

  function scanDeps(tableName: string) {
    for (const table of allTables) {
      if (involvedTables.includes(table)) continue
      for (const field of table.field_list) {
        if (field.references?.table == tableName) {
          involvedTables.push(table)
          scanDeps(table.name)
          break
        }
      }
    }
  }
  scanDeps(tableName)

  function genCreateTable(table: Table): string {
    const code = toKnexCreateTableCode(table, db_client)
    const lines = code.split('\n').slice(1)
    lines.forEach((line, i) => {
      if (i == 0) {
        lines[i] = line.slice(2)
      } else {
        lines[i] = '  ' + line
      }
    })
    return lines.join('\n')
  }

  const code = `
  {
    // alter column (${table.name}.${field.name}) to be ${field.is_null ? 'nullable' : 'non-nullable'}

    ${involvedTables.map(table => `let ${table.name}_rows = await knex.select('*').from('${table.name}')`).join('\n    ')}

    ${involvedTables
      .slice()
      .reverse()
      .map(table => `await knex.schema.dropTable('${table.name}')`)
      .join('\n    ')}

    ${involvedTables.map(genCreateTable).join('\n    ')}

    ${involvedTables
      .map(
        table => `for (let row of ${table.name}_rows) {
      await knex.insert(row).into('${table.name}')
    }`,
      )
      .join('\n    ')}
  }`
  return code
}
function alterPostgresEnum(table: Table, field: Field): string[] {
  const lines: string[] = []
  const name = `${table.name}_${field.name}_check`
  const values = field.type.replace(/enum/i, '')
  lines.push(`table.dropChecks('${name}')`)
  lines.push(
    `table.check(\`"${field.name}" in ${values}\`, undefined, '${name}')`,
  )
  return lines
}
function alterType(field: Field, db_client: string): string {
  let code = 'table'
  code += toKnexCreateColumnTypeCode(field, db_client)
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

  if (db_client.includes('mssql')) {
    return await scanMssqlTableSchema(knex)
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
