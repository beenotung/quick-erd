#!/usr/bin/env node

import { textToSpring } from '../db/text-to-spring'

/* eslint-disable no-console */

function main() {
  let text = ''
  process.stdin
    .on('data', chunk => (text += chunk))
    .on('end', () => {
      if (!text) {
        console.error('missing erd text from stdin')
        process.exit(1)
      }
      textToSpring(text)
    })
}

main()
