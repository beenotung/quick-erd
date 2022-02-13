import fs from 'fs'
import { parse } from '../core/ast'
import { tablesToText } from '../core/table'

function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('missing filename in argument')
    process.exit(1)
  }
  const text = fs.readFileSync(file).toString()
  const result = parse(text)
  const newText = tablesToText(result.table_list) + '\n'

  if (newText === text) {
    // eslint-disable-next-line no-console
    console.log(`Skip ${file}: already formatted`)
    return
  }

  fs.writeFileSync(file + backupFileSuffix(), text)
  fs.writeFileSync(file, newText)
  // eslint-disable-next-line no-console
  console.log('Formatted', file)
}

function backupFileSuffix() {
  const date = new Date()
  return (
    '.bk_' +
    date.getFullYear() +
    d2(date.getMonth() + 1) +
    d2(date.getDate()) +
    d2(date.getHours()) +
    d2(date.getMinutes()) +
    d2(date.getSeconds())
  )
}

function d2(x: number): string | number {
  if (x < 10) {
    return '0' + x
  }
  return x
}

main()
