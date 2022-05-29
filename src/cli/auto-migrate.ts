#!/usr/bin/env node

import { parse } from '../core/ast'
import { readErdFromStdin } from '../utils/file'
import {
  detectSrcDir,
  setupKnexFile,
  setupKnexMigration,
  setupSqlite,
} from '../db/auto-migrate'
import { loadKnex, loadSqliteKnex } from '../db/knex'

/* eslint-disable no-console */

const dbFile_or_client = process.argv[2]
if (!dbFile_or_client) {
  console.error('missing database client or sqlite filename in argument')
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
      break
    default: {
      db_client = 'better-sqlite3'
      dbFile = dbFile_or_client
      setupSqlite({ srcDir, dbFile })
    }
  }
  setupKnexFile({ srcDir, db_client })
  const knex = dbFile ? loadSqliteKnex(dbFile) : loadKnex(db_client)
  await setupKnexMigration({ knex, parseResult, db_client })
}

main()
