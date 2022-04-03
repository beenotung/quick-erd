import fs from 'fs'
import { parse } from '../core/ast'
import { tablesToText } from '../core/table'

function parseArgs() {
  let inFile: string | null = null
  let refFile: string | null = null
  for (let i = 2; i < process.argv.length; i++) {
    let arg = process.argv[i]
    if (arg === '-r' || arg === '--ref') {
      i++
      arg = process.argv[i]
      if (!arg) {
        console.error('missing reference filename in argument')
        process.exit(1)
      }
      refFile = arg
    } else {
      inFile = arg
    }
  }
  if (!inFile) {
    console.error('missing filename in argument')
    process.exit(1)
  }
  return { inFile, refFile }
}

function main() {
  const { inFile, refFile } = parseArgs()

  const text = fs.readFileSync(inFile).toString()
  const result = parse(text)

  if (refFile) {
    const refText = fs.readFileSync(refFile).toString()
    const refResult = parse(refText)
    sortWithRef(result.table_list, refResult.table_list)
    result.table_list.forEach(table => {
      const refTable = refResult.table_list.find(t => t.name === table.name)
      if (refTable) {
        sortWithRef(table.field_list, refTable.field_list)
      }
    })
  }

  const newText = tablesToText(result.table_list) + '\n'

  if (newText === text) {
    // eslint-disable-next-line no-console
    console.log(`Skip ${inFile}: already formatted`)
    return
  }

  fs.writeFileSync(inFile + backupFileSuffix(), text)
  fs.writeFileSync(inFile, newText)
  // eslint-disable-next-line no-console
  console.log('Formatted', inFile)
}

function sortWithRef<T extends { name: string }>(list: T[], refList: T[]) {
  const refNames = refList.map(x => x.name)
  const listNames = list.map(x => x.name)

  const newItems: T[] = []
  const oldItems: T[] = []
  list.forEach(item => {
    if (refNames.includes(item.name)) {
      oldItems.push(item)
    } else {
      newItems.push(item)
    }
  })
  for (let i = 0; i < oldItems.length; i++) {
    list[i] = oldItems[i]
  }
  for (let i = 0; i < newItems.length; i++) {
    list[i + oldItems.length] = newItems[i]
  }

  list.sort((a, b) => {
    let aIdx = refNames.indexOf(a.name)
    let bIdx = refNames.indexOf(b.name)
    if (aIdx !== -1 && bIdx !== -1) {
      return aIdx - bIdx
    }
    aIdx = listNames.indexOf(a.name)
    bIdx = listNames.indexOf(b.name)
    return aIdx - bIdx
  })
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
