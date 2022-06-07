#!/usr/bin/env node
import { textToSqliteProxy } from '../db/text-to-sqlite-proxy'
import { readErdFromStdin } from '../utils/file'

function main() {
  readErdFromStdin(text => {
    const code = textToSqliteProxy(text)
    // eslint-disable-next-line no-console
    console.log(code)
  })
}

main()
