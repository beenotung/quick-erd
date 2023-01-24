import {
  textBgColorRegex,
  textBgColorToLine,
  tableNameToLine,
  tableNameToRegex,
  textColorRegex,
  textColorToLine,
  viewLineRegex,
  viewToLine,
  zoomLineRegex,
  zoomToLine,
  diagramBgColorToLine,
  tableBgColorToLine,
  tableBgColorRegex,
  diagramBgColorRegex,
  tableTextColorRegex,
  tableTextColorToLine,
  diagramTextColorRegex,
  diagramTextColorToLine,
} from '../core/meta'
import { StoredString } from './storage'

export class InputController {
  constructor(
    private input: HTMLTextAreaElement,
    private stored: StoredString,
  ) {}

  setTextBgColor(color: string) {
    this.updateLine(textBgColorRegex, textBgColorToLine(color))
  }
  setTextColor(color: string) {
    this.updateLine(textColorRegex, textColorToLine(color))
  }
  setDiagramBgColor(color: string) {
    this.updateLine(diagramBgColorRegex, diagramBgColorToLine(color))
  }
  setDiagramTextColor(color: string) {
    this.updateLine(diagramTextColorRegex, diagramTextColorToLine(color))
  }
  setTableBgColor(color: string) {
    this.updateLine(tableBgColorRegex, tableBgColorToLine(color))
  }
  setTableTextColor(color: string) {
    this.updateLine(tableTextColorRegex, tableTextColorToLine(color))
  }
  setZoom(zoom: number) {
    this.updateLine(zoomLineRegex, zoomToLine(zoom))
  }
  setViewPosition(view: { x: number; y: number }) {
    this.updateLine(viewLineRegex, viewToLine(view))
  }
  setTablePosition(name: string, position: { x: number; y: number }) {
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

  private findTableNameIndex(table: string) {
    const { input } = this

    const start = input.value.indexOf(table + '\n-')
    if (start === -1) return

    const end = start + table.length

    return { start, end }
  }

  private findFieldNameIndex(field: string, tableIndex: SelectionRange) {
    const text = this.input.value + ' '
    let start = text.indexOf('\n' + field + ' ', tableIndex.end + 1)
    if (start === -1) return
    start += 1
    const end = start + field.length
    return { start, end }
  }
}

type SelectionRange = { start: number; end: number }
