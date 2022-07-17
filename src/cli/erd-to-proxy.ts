#!/usr/bin/env node
import { textToSqliteProxy } from '../db/text-to-sqlite-proxy'
import { readErdFromStdin } from '../utils/file'

function main() {
  let mode: 'factory' | 'singleton' | undefined
  const arg = process.argv[2]
  switch (arg) {
    case undefined:
      break
    case '--factory': {
      mode = 'factory'
      break
    }
    case '--singleton': {
      mode = 'singleton'
      break
    }
    default: {
      console.error('Error: unknown argument:', arg)
      process.exit(1)
    }
  }
  readErdFromStdin(text => {
    const code = textToSqliteProxy(text, { mode })
    // eslint-disable-next-line no-console
    console.log(code)
  })
}

main()
