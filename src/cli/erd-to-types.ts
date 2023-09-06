#!/usr/bin/env node
import { textToTypes, trimCode } from '../db/text-to-types'
import { readErdFromStdin } from '../utils/file'

function main() {
  readErdFromStdin(text => {
    const { tableTypes } = textToTypes(text)
    const code = trimCode(tableTypes)
    // eslint-disable-next-line no-console
    console.log(code)
  })
}

main()
