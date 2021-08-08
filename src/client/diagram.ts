import { ParseResult, Table } from './ast'
const { random, floor } = Math

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
    tableDiv.addEventListener('mousedown', ev => {
      this.maxZIndex++
      tableDiv.style.zIndex = this.maxZIndex.toString()
      isMouseDown = true
      startX = ev.clientX
      startY = ev.clientY
      this.onMouseMove = ev => {
        if (!isMouseDown) return
        controller.translateX += ev.clientX - startX
        controller.translateY += ev.clientY - startY
        startX = ev.clientX
        startY = ev.clientY
        controller.renderTransform()
      }
    })
    tableDiv.addEventListener('mouseup', ev => {
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

  autoPlace() {
    const tableRectMap = new Map<TableController, ClientRect>()
    this.tableMap.forEach(table => {
      const rect = table.div.getBoundingClientRect()
      tableRectMap.set(table, rect)
    })
    const diagramRect = this.div.getBoundingClientRect()

    for (let isMoved = true; isMoved; ) {
      isMoved = false

      tableRectMap.forEach((rect, table) => {
        tableRectMap.forEach((otherRect, otherTable) => {
          if (table === otherTable) return
          if (!isRectCollide(rect, otherRect)) return
          const exploreRect = { ...rect }
          let offsetX = 0
          let offsetY = 0
          for (;;) {
            offsetX += floor(random() * 3) - 1
            offsetY += floor(random() * 3) - 1

            exploreRect.left = rect.left + offsetX
            exploreRect.right = rect.right + offsetX
            exploreRect.top = rect.top + offsetY
            exploreRect.bottom = rect.bottom + offsetY

            if (exploreRect.left < diagramRect.left) {
              offsetX = 0
              continue
            }
            if (exploreRect.right > diagramRect.right) {
              offsetX = diagramRect.width - rect.width
              continue
            }
            if (exploreRect.top < diagramRect.top) {
              offsetY = 0
              continue
            }
            if (exploreRect.bottom > diagramRect.bottom) {
              offsetY = diagramRect.height - rect.height
              continue
            }

            if (!isRectCollide(exploreRect, otherRect)) {
              table.translateX += offsetX
              table.translateY += offsetY
              table.renderTransform()
              tableRectMap.set(table, table.div.getBoundingClientRect())
              isMoved = true
              return
            }
          }
        })
      })
    }
  }
}

function isRectCollide(self: ClientRect, other: ClientRect): boolean {
  const list = [
    [self, other],
    [other, self],
  ]
  for (const [self, other] of list) {
    if (
      isPointInside(self, other.left, other.top) ||
      isPointInside(self, other.right, other.top) ||
      isPointInside(self, other.right, other.bottom) ||
      isPointInside(self, other.left, other.bottom) ||
      isRectInside(self, other)
    ) {
      return true
    }
  }
  return false
}

function isPointInside(rect: ClientRect, x: number, y: number): boolean {
  return rect.left <= x && x <= rect.right && rect.top <= y && y <= rect.bottom
}
function isRectInside(outer: ClientRect, inner: ClientRect): boolean {
  return (
    (outer.left <= inner.left && inner.right <= outer.right) ||
    (outer.top <= inner.top && inner.bottom <= outer.bottom)
  )
}

export class TableController {
  translateX = 0
  translateY = 0
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

  renderTransform() {
    this.div.style.transform = `translate(${this.translateX}px,${this.translateY}px)`
  }
}
