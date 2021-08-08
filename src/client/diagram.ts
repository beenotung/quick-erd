import { ParseResult, Table } from './ast'

export class DiagramController {
  message = this.div.querySelector('.message') as HTMLDivElement
  tableMap = new Map<string, TableController>()
  maxZIndex = 0

  onMouseMove?: (ev: MouseEvent) => void

  constructor(public div: HTMLDivElement) {
    this.div.addEventListener('mousemove', ev => {
      this.onMouseMove?.(ev)
    })
    this.div.addEventListener('mouseup', () => {
      delete this.onMouseMove
    })
  }

  remove(table: TableController) {
    table.div.remove()
    this.tableMap.delete(table.name)
  }

  add(table: Table) {
    const tableDiv = document.createElement('div')
    tableDiv.dataset.table = table.name
    let isMouseDown = false
    let startX = 0
    let startY = 0
    let translateX = 0
    let translateY = 0
    tableDiv.addEventListener('mousedown', ev => {
      console.debug('mousedown', ev)
      this.maxZIndex++
      tableDiv.style.zIndex = this.maxZIndex.toString()
      isMouseDown = true
      startX = ev.clientX
      startY = ev.clientY
      this.onMouseMove = ev => {
        if (!isMouseDown) return
        translateX += ev.clientX - startX
        translateY += ev.clientY - startY
        startX = ev.clientX
        startY = ev.clientY
        tableDiv.style.transform = `translate(${translateX}px,${translateY}px)`
        console.debug('mousemove', ev)
      }
    })
    tableDiv.addEventListener('mouseup', ev => {
      console.debug('mouseup', ev)
      isMouseDown = false
    })
    this.div.appendChild(tableDiv)

    const controller = new TableController(this, tableDiv, table.name)
    this.tableMap.set(table.name, controller)
    controller.render(table)
  }

  render({ table_list, relation_list }: ParseResult) {
    if (table_list.length === 0) {
      this.message.style.display = 'initial'
      return
    }
    this.message.style.display = 'none'

    const newTableMap = new Map(table_list.map(table => [table.name, table]))

    // remove old table
    this.tableMap.forEach((table, name) => {
      if (!newTableMap.has(name)) {
        this.remove(table)
      }
    })

    // add new tables or update existing tables
    newTableMap.forEach((table, name) => {
      const controller = this.tableMap.get(name)
      if (controller) {
        controller.render(table)
      } else {
        this.add(table)
      }
    })
  }
}

export class TableController {
  constructor(
    public diagram: DiagramController,
    public div: HTMLDivElement,
    public name: string,
  ) {}

  render({ name, field_list }: Table) {
    this.div.innerHTML = /* html */ `
<div class='table-title'>${name}</div>
<table>
  <tbody>
  ${field_list
    .map(
      ({ name, type }) => /* html */ `
    <tr class='table-field'>
      <td class='table-field-name'>${name}</td>
      <td class='table-field-type'>${type}</td>
    </tr>
`,
    )
    .join('')}
  </tbody>
</table>
</div>
`
  }
}
