import {
  tableNameToLine,
  tableNameToRegex,
  viewLineRegex,
  viewToLine,
  zoomLineRegex,
  zoomToLine,
  Position,
  TablePositionColor,
  ColorName,
  colors,
} from '../core/meta'
import { showCopyResult } from './copy'
import { querySelector } from './dom'
import { StoredString } from './storage'

export class ErdInputController {
  constructor(
    private input: HTMLTextAreaElement,
    private stored: StoredString,
  ) {
    this.setupCopyListener()
  }

  private setupCopyListener() {
    const input = this.input
    const copyBtn = querySelector(
      document.body,
      '.erd-controls .copy-btn',
    ) as HTMLButtonElement
    copyBtn.addEventListener('click', () => {
      input.select()
      input.selectionStart = 0
      input.selectionEnd = input.value.length
      const result = Promise.resolve(
        navigator.clipboard
          ? navigator.clipboard.writeText(input.value).then(() => true)
          : document.execCommand('copy'),
      )
      showCopyResult(copyBtn, result)
    })
  }

  setColor(name: ColorName, color: string) {
    const { regex, toLine } = colors[name]
    this.updateLine(regex, toLine(color))
  }

  resetColor() {
    Object.values(colors).forEach(({ regex }) => this.updateLine(regex, ''))
  }

  setZoom(zoom: number) {
    this.updateLine(zoomLineRegex, zoomToLine(zoom))
  }
  setViewPosition(view: Position) {
    this.updateLine(viewLineRegex, viewToLine(view))
  }
  setTablePosition(name: string, position: TablePositionColor) {
    this.updateLine(tableNameToRegex(name), tableNameToLine(name, position))
  }

  private isEmpty() {
    for (let line of this.input.value.split('\n')) {
      line = line.trim()
      if (line && !line.trim().startsWith('# ')) {
        return false
      }
    }
    return true
  }

  private updateLine(regex: RegExp, line: string) {
    if (this.isEmpty()) return
    const { input } = this
    let value = input.value
    if (value.match(regex)) {
      value = value.replace(regex, line)
    } else {
      value = value.trim()
      if (!value.split('\n').pop()?.startsWith('# ')) {
        value += '\n\n'
      }
      value += '\n' + line
    }
    this.setValue(value)
  }

  private setValue(value: string) {
    const { input } = this
    const { selectionStart, selectionEnd, selectionDirection } = input
    input.value = value
    this.stored.value = value
    input.selectionStart = selectionStart
    input.selectionEnd = selectionEnd
    input.selectionDirection = selectionDirection
  }

  removeTable(name: string) {
    const value = this.input.value
    const regex =
      // new RegExp(`\r?\n# ${name} \\([0-9-]+, [0-9-]+\\)`)
      new RegExp('\\r?\\n' + tableNameToRegex(name).toString().slice(1, -1))
    const newValue = value.replace(regex, '')
    if (value != newValue) {
      this.setValue(newValue.trim())
    }
  }

  selectTable(table: string) {
    const { input } = this

    const index = this.findTableNameIndex(table)
    if (!index) return

    input.select()
    input.setSelectionRange(index.start, index.end, 'forward')
  }

  selectField(table: string, field: string) {
    const { input } = this

    const tableIndex = this.findTableNameIndex(table)
    if (!tableIndex) return

    const fieldIndex = this.findFieldNameIndex(field, tableIndex)
    if (!fieldIndex) return

    input.select()
    input.setSelectionRange(fieldIndex.start, fieldIndex.end, 'forward')
  }

  addField(table: string, lastField: string) {
    const { input } = this

    const tableIndex = this.findTableNameIndex(table)
    if (!tableIndex) return

    const fieldIndex = this.findFieldNameIndex(lastField, tableIndex)
    if (!fieldIndex) return

    let lineStartIndex = input.value.indexOf('\n', fieldIndex.end + 1)

    if (lineStartIndex == -1) {
      input.value += '\n'
      lineStartIndex = input.value.length - 1
    } else {
      lineStartIndex++
    }

    const spaceCount = 5
    const lineEndIndex = lineStartIndex + spaceCount

    const spaceLine = ' '.repeat(spaceCount) + '\n'

    if (
      input.value.slice(lineStartIndex, lineStartIndex + spaceCount + 1) !=
      spaceLine
    ) {
      const before = input.value.slice(0, lineStartIndex)
      const after = input.value.slice(lineStartIndex)
      input.value = before + ' '.repeat(spaceCount) + '\n' + after
    }

    input.select()
    input.setSelectionRange(lineStartIndex, lineEndIndex, 'forward')
  }

  renameField(args: {
    fromTable: string
    fromField: { oldName: string; newName: string }
    toTable: {
      oldName: string
      newName: string
    }
  }) {
    const { fromTable, fromField, toTable } = args

    const tableIndex = this.findTableNameIndex(fromTable)
    if (!tableIndex) return

    const fieldIndex = this.findFieldNameIndex(fromField.oldName, tableIndex)
    if (!fieldIndex) return

    let text = this.input.value
    let before = text.slice(0, fieldIndex.start)
    let middle = fromField.newName
    let after = text
      .slice(fieldIndex.start + fromField.oldName.length)
      .split('\n')
    after[0] = after[0].replace(
      toTable.oldName + '.id',
      toTable.newName + '.id',
    )
    // TODO redraw ref line

    this.setValue(before + middle + after.join('\n'))
  }

  private findTableNameIndex(table: string) {
    const { input } = this

    const start = input.value.indexOf(table + '\n-')
    if (start === -1) return

    const end = start + table.length

    return { start, end }
  }

  private findFieldNameIndex(
    field: string,
    tableIndex: SelectionRange,
  ): SelectionRange | undefined {
    const text = this.input.value + ' '

    const space_start = text.indexOf('\n' + field + ' ', tableIndex.end + 1)
    const newline_start = text.indexOf('\n' + field + '\n', tableIndex.end + 1)

    if (space_start == -1 && newline_start == -1) return

    const space_range: SelectionRange = {
      start: space_start + 1,
      end: space_start + 1 + field.length,
    }
    const newline_range: SelectionRange = {
      start: newline_start + 1,
      end: newline_start + field.length,
    }

    if (space_start == -1) return newline_range

    if (newline_start == -1) return space_range

    return space_start < newline_start ? space_range : newline_range
  }
}

type SelectionRange = { start: number; end: number }
