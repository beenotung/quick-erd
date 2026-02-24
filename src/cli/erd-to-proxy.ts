#!/usr/bin/env node
import { existsSync } from 'fs'
import { textToSqliteProxy } from '../db/text-to-sqlite-proxy'
import { readErdFromStdin, readPackageJSON } from '../utils/file'

function main() {
  const command = getCommand()
  let mode: 'factory' | 'singleton' | undefined
  let type: 'commonjs' | 'module' | undefined
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
    case '--commonjs':
    case '--cjs': {
      type = 'commonjs'
      break
    }
    case '--module':
    case '--esm': {
      type = 'module'
      break
    }
    default: {
      console.error('Error: unknown argument:', arg)
      process.exit(1)
    }
  }
  const packageFile = 'package.json'
  if (!type && existsSync(packageFile)) {
    type = readPackageJSON(packageFile).type
  }

  readErdFromStdin(text => {
    const code = textToSqliteProxy(text, { mode, type, command })
    // eslint-disable-next-line no-console
    console.log(code)
  })
}

function getCommand() {
  const args = process.argv.slice(2).join(' ')
  let command = `npx erd-to-proxy`
  if (args) {
    command += ' ' + args
  }
  const erd_file = existsSync('docs/erd.txt') ? 'docs/erd.txt' : 'erd.txt'
  const proxy_file = existsSync('src') ? 'src/proxy.ts' : 'proxy.ts'
  command += ` < ${erd_file} > ${proxy_file}`
  return command
}

main()
