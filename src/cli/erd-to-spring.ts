#!/usr/bin/env node

import { env } from '../db/env'
import { textToSpring } from '../db/text-to-spring'
import { detectDBClient } from '../utils/cli'

/* eslint-disable no-console */

let dbFile_or_client = env.DB_CLIENT || ''
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg === '--help') {
    // TODO
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

const dbClient = detectDBClient(dbFile_or_client)

function main() {
  let text = ''
  process.stdin
    .on('data', chunk => (text += chunk))
    .on('end', () => {
      if (!text) {
        console.error('missing erd text from stdin')
        process.exit(1)
      }
      textToSpring(dbClient, text)
    })
}

main()
