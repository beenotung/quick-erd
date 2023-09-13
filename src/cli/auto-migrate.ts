#!/usr/bin/env node

import { parse } from '../core/ast'
import { readErdFromStdin } from '../utils/file'
import {
  detectSrcDir,
  setupEnvFile,
  setupNpmScripts,
  setupKnexFile,
  setupKnexMigration,
  setupSqlite,
} from '../db/auto-migrate'
import { loadKnex, loadSqliteKnex } from '../db/knex'
import { env } from '../db/env'

/* eslint-disable no-console */

let dbFile_or_client = env.DB_CLIENT || ''
let detect_rename = false
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg === '--rename' || arg === '-r') {
    detect_rename = true
    continue
  }
  dbFile_or_client = arg
}
if (!dbFile_or_client) {
  console.error('Error: missing argument')
  console.error('Either provide sqlite filename in argument')
  console.error(
    'Or provide database client in argument or DB_CLIENT environment variable',
  )
  process.exit(1)
}

async function main() {
  const erd = await new Promise<string>(resolve => readErdFromStdin(resolve))
  const parseResult = parse(erd)
  const srcDir = detectSrcDir()
  let db_client: string
  let dbFile: string | undefined
  switch (dbFile_or_client) {
    case 'mysql':
    case 'pg':
    case 'postgresql':
      db_client = dbFile_or_client
      setupEnvFile({ srcDir, db_client })
      break
    default: {
      db_client = 'better-sqlite3'
      dbFile = dbFile_or_client
      setupSqlite({ srcDir, dbFile })
    }
  }
  setupNpmScripts({ srcDir, db_client, dbFile })
  setupKnexFile({ srcDir, db_client })
  const knex = dbFile ? loadSqliteKnex(dbFile) : loadKnex(db_client)
  await setupKnexMigration({
    knex,
    parseResult,
    db_client,
    detect_rename,
  })
}

main()
