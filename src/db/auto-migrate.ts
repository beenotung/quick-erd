import { existsSync, mkdirSync, readdirSync } from 'fs'
import { Knex as KnexType } from 'knex'
import { join } from 'path'
import { inspect } from 'util'
import { Field, ParseResult, Table } from '../core/ast'
import { addDependencies, writeSrcFile } from '../utils/file'
import { isObjectSample } from '../utils/object'
import { scanMysqlTableSchema } from './mysql-to-text'
import { scanPGTableSchema } from './pg-to-text'
import { parseTableSchema } from './sqlite-parser'
import {
  toKnexCreateTableCode,
  toKnexCreateColumnCode,
  toKnexCreateColumnTypeCode,
} from './text-to-knex'

export function detectSrcDir() {
  for (const dir of ['src', 'server', '.']) {
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
  addDependencies('better-sqlite3-schema', '^2.3.3')
  addDependencies('@types/integer', '^4.0.1', 'dev')
  const code = `
import { toSafeMode, newDB } from 'better-sqlite3-schema'

export let dbFile = ${inspect(options.dbFile)}

export let db = newDB({
  path: dbFile,
  migrate: false,
})

toSafeMode(db)
`
  writeSrcFile(dbTsFile, code)
  return
}

export function setupEnvFile(options: { srcDir: string }) {
  const file = join(options.srcDir, 'env.ts')
  if (existsSync(file)) {
    return
  }
  addDependencies('dotenv', '^16.0.1')
  addDependencies('populate-env', '^2.0.0')
  const code = `
import { config } from 'dotenv'
import populateEnv from 'populate-env'

config()

export const env = {
  DB_HOST: 'optional',
  DB_PORT: 1,
  DB_NAME: '',
  DB_USERNAME: '',
  DB_PASSWORD: '',
}

populateEnv(env, { mode: 'halt' })

env.DB_HOST = process.env.DB_HOST
env.DB_PORT = +process.env.DB_PORT!
`
  writeSrcFile(file, code)
}

export function setupKnexFile(options: { srcDir: string; db_client: string }) {
  const { srcDir, db_client } = options
  const file = 'knexfile.ts'
  if (existsSync(file)) {
    return
  }
  addDependencies('knex', '^2.0.0')
  let code: string
  if (db_client.includes('sqlite')) {
    code = `
import type { Knex } from 'knex'
import { dbFile } from './${srcDir}/db'

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
import { env } from './${srcDir}/env'

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

export async function setupKnexMigration(options: {
  knex: KnexType
  db_client: string
  parseResult: ParseResult
}) {
  if (!existsSync(migrations_dir)) {
    mkdirSync(migrations_dir)
  }

  const { knex, db_client } = options

  await checkPendingMigrations(knex)

  log('Scanning existing database schema...')
  const table_list: Table[] = await loadTableList(knex, db_client)

  const up_lines: string[] = []
  const down_lines: string[] = []

  options.parseResult.table_list.forEach(table => {
    const { name, field_list } = table
    const existing_table = table_list.find(table => table.name === name)
    if (!existing_table) {
      up_lines.push(toKnexCreateTableCode(table))
      down_lines.unshift(`  await knex.schema.dropTableIfExists('${name}')`)
      return
    }
    const table_up_lines: string[] = []
    const table_down_lines: string[] = []
    field_list.forEach(field => {
      const { name } = field
      const existing_field = existing_table.field_list.find(
        field => field.name === name,
      )
      if (!existing_field) {
        table_up_lines.push(toKnexCreateColumnCode(field))
        table_down_lines.unshift(`table.dropColumn(${inspect(name)})`)
        return
      }

      if (
        field.type !== existing_field.type ||
        field.is_unsigned !== existing_field.is_unsigned
      ) {
        table_up_lines.push(alterType(field))
        table_down_lines.unshift(alterType(existing_field))
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
        table_up_lines.push(alterNullable(field))
        table_down_lines.unshift(alterNullable(existing_field))
      }

      if (
        !isObjectSample(field.references || {}, existing_field.references || {})
      ) {
        table_up_lines.push(alterForeignKey(field))
        table_down_lines.unshift(alterForeignKey(existing_field))
      }
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

    if (table_down_lines.length > 0) {
      down_lines.unshift(
        `  await knex.schema.alterTable('${name}', table => {
${mergeLines(table_down_lines)}
  })`,
      )
    }
  })

  if (up_lines.length > 0 && down_lines.length > 0) {
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
  } else {
    log('No migration is needed.')
  }

  await knex.destroy()
}

function alterType(field: Field): string {
  let code = 'table'
  code += toKnexCreateColumnTypeCode(field)
  if (field.is_null) {
    code += '.nullable()'
  } else {
    code += '.notNullable()'
  }
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
function alterForeignKey(field: Field): string {
  if (field.references) {
    return `table.foreign(${inspect(field.name)}).references(${inspect(
      field.references.table + '.' + field.references.field,
    )})`
  } else {
    return `table.dropForeign(${inspect(field.name)})`
  }
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
