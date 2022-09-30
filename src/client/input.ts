export class InputController {
  constructor(public input: HTMLTextAreaElement) {}

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
