#!/usr/bin/env node

import { parse } from '../core/ast'
import { readErdFromStdin } from '../utils/file'
import { dbFile } from '../db/sqlite'
import {
  detectSrcDir,
  setupKnexFile,
  setupKnexMigration,
  setupSqlite,
} from '../db/auto-migrate'
import { loadKnex } from '../db/knex'

/* eslint-disable no-console */

async function main() {
  const erd = await new Promise<string>(resolve => readErdFromStdin(resolve))
  const parseResult = parse(erd)
  const srcDir = detectSrcDir()
  setupSqlite({ srcDir, dbFile })
  const db_client = 'better-sqlite3'
  setupKnexFile({ srcDir, db_client })
  const knex = loadKnex()
  await setupKnexMigration({ knex, parseResult, db_client })
}

main()
