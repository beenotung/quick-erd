#!/usr/bin/env node
import { readErdFromStdin } from '../utils/file'
import { textToKnex } from '../db/text-to-knex'
import { env } from '../db/env'

let db_client = env.DB_CLIENT || ''
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  db_client = arg
}
if (!db_client) {
  console.error('Error: missing argument')
  console.error(
    'Please provide database client in argument or DB_CLIENT environment variable',
  )
  process.exit(1)
}

function main() {
  readErdFromStdin(text => {
    const code = textToKnex(text, db_client)
    // eslint-disable-next-line no-console
    console.log(code)
  })
}

main()
