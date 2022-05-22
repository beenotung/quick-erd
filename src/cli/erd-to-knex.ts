#!/usr/bin/env node
import { readErdFromStdin } from '../utils/file'
import { textToKnex } from '../db/text-to-knex'

function main() {
  readErdFromStdin(text => {
    const code = textToKnex(text)
    // eslint-disable-next-line no-console
    console.log(code)
  })
}

main()
