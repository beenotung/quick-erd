import { StoredNumber, StoredString } from './storage'
import { Field, Parser, ParseResult, Table } from '../core/ast'
import { astToText, fieldToString } from '../core/table'

export function compressAST(ast: ParseResult): string {
  let hash = ''

  for (const table of ast.table_list) {
    hash += compressTable(table)
  }

  const meta: string[] = []

  if (ast.zoom) {
    meta.push('z:' + ast.zoom.toFixed(3))
  }
  if (ast.view) {
    meta.push('v:' + ast.view.x.toFixed(0) + ',' + ast.view.y.toFixed(0))
  }
  if (ast.textBgColor) {
    meta.push('T:' + ast.textBgColor)
  }
  if (ast.textColor) {
    meta.push('t:' + ast.textColor)
  }
  if (ast.diagramBgColor) {
    meta.push('D:' + ast.diagramBgColor)
  }
  if (ast.diagramTextColor) {
    meta.push('d:' + ast.diagramTextColor)
  }
  if (ast.tableBgColor) {
    meta.push('R:' + ast.tableBgColor)
  }
  if (ast.tableTextColor) {
    meta.push('r:' + ast.tableTextColor)
  }

  hash += meta.join('|').replaceAll('#', '')

  return hash
}

export function decompressAST(hash: string): ParseResult {
  const parser = new Parser()

  for (const match of hash.matchAll(/(\w+)\[(.*?)\]/g)) {
    hash = hash.replace(match[0], '')
    const tableName = match[1]
    const tableText = match[2]
    decompressTable(parser, tableName, tableText)
  }

  const ast = parser
  const meta = hash.split('|')
  for (const text of meta) {
    const [key, value] = text.split(':')
    switch (key) {
      case 'z':
        ast.zoom = +value
        break
      case 'v': {
        const [x, y] = value.split(',')
        ast.view = { x: +x, y: +y }
        break
      }
      case 'T':
        ast.textBgColor = '#' + value
        break
      case 't':
        ast.textColor = '#' + value
        break
      case 'D':
        ast.diagramBgColor = '#' + value
        break
      case 'd':
        ast.diagramTextColor = '#' + value
        break
      case 'R':
        ast.tableBgColor = '#' + value
        break
      case 'r':
        ast.tableTextColor = '#' + value
        break
      default:
        console.warn('unknown meta in hash:', { key, value })
    }
  }

  return parser
}

export function autoLoadFromHash(
  erdText: StoredString,
  zoomLevel: StoredNumber,
  view: {
    x: StoredNumber
    y: StoredNumber
  },
) {
  const hash = location.hash.replace('#', '').trim()
  if (!hash) return

  const ast = decompressAST(hash)
  const text = astToText(ast)

  erdText.value = text

  if (ast.zoom) {
    zoomLevel.value = ast.zoom
  }
  if (ast.view) {
    view.x.value = ast.view.x
    view.y.value = ast.view.y
  }

  location.hash = ''
}

function compressTable(table: Table): string {
  let body = table.field_list.map(compressField).join('|')
  let position = table.position
  let meta = ''
  if (position) {
    meta = '@' + position.x.toFixed(0) + ',' + position.y.toFixed(0)
    if (position.color) {
      meta += ',' + position.color.replace('#', '')
    }
  }
  return `${table.name}[${body}${meta}]`
}

function decompressTable(parser: Parser, tableName: string, tableText: string) {
  parser.line_list.push(tableName)
  parser.line_list.push('-')
  let [body, meta] = tableText.split('@')
  for (const text of body.split('|')) {
    parser.line_list.push(decompressField(text))
  }
  let table = parser.parseTable()
  if (meta) {
    let [x, y, color] = meta.split(',')
    table.position = {
      x: +x,
      y: +y,
    }
    if (color) {
      table.position.color = '#' + color
    }
  }
  parser.table_list.push(table)
}

function compressField(field: Field): string {
  return fieldToString(field).replaceAll(' ', '+')
}

function decompressField(text: string): string {
  return text.replaceAll('+', ' ')
}
