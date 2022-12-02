export class InputController {
  constructor(public input: HTMLTextAreaElement) {}

  setZoom(zoom: number) {
    let line = `# zoom: ${zoom.toFixed(3)}`
    let regex = /# zoom: [0-9.]+/
    this.updateLine(regex, line)
  }
  setViewPosition(position: { x: number; y: number }) {
    let x = position.x.toFixed(0)
    let y = position.y.toFixed(0)
    let regex = /# view: \([0-9-]+, [0-9-]+\)/
    let line = `# view: (${x}, ${y})`
    this.updateLine(regex, line)
  }
  setTablePosition(name: string, position: { x: number; y: number }) {
    let x = position.x.toFixed(0)
    let y = position.y.toFixed(0)
    // FIXME fix the regex
    let regex = new RegExp(`# ${name} \([0-9-]+, [0-9-]+\)`)
    let line = `# ${name} (${x}, ${y})`
    this.updateLine(regex, line)
  }

  private updateLine(regex: RegExp, line: string) {
    let value = this.input.value
    this.input.value = value.match(regex)
      ? value.replace(regex, line)
      : value.trim() + '\r\n' + line
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
