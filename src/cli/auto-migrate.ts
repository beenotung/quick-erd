#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync } from 'fs'
import Knex, { Knex as KnexType } from 'knex'
import { join } from 'path'
import { cwd } from 'process'
import { inspect } from 'util'
import { parse, ParseResult, Table, Field } from '../core/ast'
import {
  addDependencies,
  readErdFromStdin,
  writeSrcFile as _writeSrcFile,
} from '../utils/file'
import { dbFile } from '../db/sqlite'
import { parseTableSchema } from '../db/sqlite-parser'
import {
  toKnexCreateColumnCode,
  toKnexCreateColumnTypeCode,
  toKnexCreateTableCode,
} from '../db/text-to-knex'
import { isObjectSample } from '../utils/object'

/* eslint-disable no-console */

const migrations_dir = 'migrations'

async function main() {
  console.log('Reading erd from stdin...')
  const erd = await new Promise<string>(resolve => readErdFromStdin(resolve))
  const parseResult = parse(erd)
  const { importPath } = setupSqlite()
  const { profile } = setupKnex(importPath)
  await setupMigration({ profile, parseResult })
}

function setupSqlite(): { importPath: string } {
  addDependencies('better-sqlite3-schema', '^2.3.3')
  let dbTsFile = 'db.ts'
  let importPath = './db'
  if (existsSync('src')) {
    dbTsFile = join('src', dbTsFile)
    importPath = './src/db'
  } else if (existsSync('server')) {
    dbTsFile = join('server', dbTsFile)
    importPath = './server/db'
  }
  if (existsSync(dbTsFile)) {
    return { importPath }
  }
  const code = `
import { toSafeMode, newDB } from 'better-sqlite3-schema'

export let dbFile = ${inspect(dbFile)}

export let db = newDB({
  path: dbFile,
  migrate: false,
})

toSafeMode(db)
`
  writeSrcFile(dbTsFile, code)
  return { importPath }
}

function setupKnex(importPath: string) {
  addDependencies('knex', '^2.0.0')
  const knexFile = join(cwd(), 'knexfile.ts')
  const profile = {
    client: 'better-sqlite3',
    useNullAsDefault: true,
    connection: {
      filename: dbFile,
    },
  }
  if (existsSync(knexFile)) {
    return { knexFile, profile }
  }
  const config = inspect({
    development: profile,
  }).replace(inspect(dbFile), 'dbFile')
  const code = `
import type { Knex } from 'knex'
import { dbFile } from '${importPath}'

const config: { [key: string]: Knex.Config } = ${config}

module.exports = config;
`
  writeSrcFile(knexFile, code)
  return { knexFile, profile }
}

async function setupMigration(options: {
  profile: KnexType.Config
  parseResult: ParseResult
}) {
  if (!existsSync(migrations_dir)) {
    mkdirSync(migrations_dir)
  }

  const knex = Knex(options.profile)

  await checkPendingMigrations(knex)

  console.log('Scanning existing database schema...')
  const rows: Array<{ name: string; sql: string; type: string }> =
    await knex.raw(/* sql */ `select name, sql, type from sqlite_master`)
  const table_list: Table[] = parseTableSchema(rows)

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
    console.log('No migration is needed.')
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

function writeSrcFile(file: string, code: string) {
  console.log('saving to', file, '...')
  _writeSrcFile(file, code)
}

main()
