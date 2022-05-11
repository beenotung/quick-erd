#!/usr/bin/env node
/* eslint-disable no-console */
import { textToSqlite } from '../db/text-to-sqlite'

function main() {
  let text = ''
  process.stdin
    .on('data', chunk => (text += chunk))
    .on('end', () => {
      if (!text) {
        console.error('missing erd text from stdin')
        process.exit(1)
      }
      const { up, down } = textToSqlite(text)
      console.log('-- Up')
      console.log(up)
      console.log()
      console.log('-- Down')
      console.log(down)
    })
}

main()
