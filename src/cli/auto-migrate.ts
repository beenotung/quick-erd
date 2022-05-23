#!/usr/bin/env node

import { parse } from '../core/ast'
import { readErdFromStdin } from '../utils/file'
import { dbFile } from '../db/sqlite'
import { setupKnex, setupKnexMigration, setupSqlite } from '../db/auto-migrate'

/* eslint-disable no-console */

async function main() {
  console.log('Reading erd from stdin...')
  const erd = await new Promise<string>(resolve => readErdFromStdin(resolve))
  const parseResult = parse(erd)
  const { importPath } = setupSqlite({ dbFile })
  const { profile } = setupKnex({ importPath, dbFile })
  await setupKnexMigration({ profile, parseResult })
}

main()
