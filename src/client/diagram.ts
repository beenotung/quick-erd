import { ForeignKeyReference, ParseResult, Table } from './ast'
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
    table.remove()
    this.tableMap.delete(table.data.name)
  }
  getDiagramRect() {
    return this.div.getBoundingClientRect()
  }

  add(table: Table, diagramRect: ClientRect) {
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
        controller.renderTransform(this.getDiagramRect())
      }
    })
    tableDiv.addEventListener('mouseup', () => {
      isMouseDown = false
    })
    this.div.appendChild(tableDiv)

    const controller = new TableController(this, tableDiv, table)
    this.tableMap.set(table.name, controller)
    controller.render(table)
    controller.renderTransform(diagramRect)
  }

  render({ table_list }: ParseResult) {
    // show or hide placeholder message
    if (table_list.length === 0) {
      this.message.style.display = 'initial'
    } else {
      this.message.style.display = 'none'
    }

    const newTableMap = new Map(table_list.map(table => [table.name, table]))

    // remove old table
    this.tableMap.forEach((table, name) => {
      if (!newTableMap.has(name)) {
        this.remove(table)
      }
    })

    const diagramRect = this.getDiagramRect()

    // add new tables or update existing tables
    newTableMap.forEach((table, name) => {
      const controller = this.tableMap.get(name)
      if (controller) {
        controller.render(table)
      } else {
        this.add(table, diagramRect)
      }
    })

    // draw line
    this.tableMap.forEach(table => {
      table.renderLine(diagramRect)
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
              table.renderTransform(diagramRect)
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

class TableController {
  translateX = +(localStorage.getItem(this.data.name + '-x') || '0')
  translateY = +(localStorage.getItem(this.data.name + '-y') || '0')
  // self field -> line
  lineMap = new Map<string, LineController>()
  reverseLineSet = new Set<LineController>()

  onMoveListenerSet = new Set<(diagramRect: ClientRect) => void>()

  constructor(
    public diagram: DiagramController,
    public div: HTMLDivElement,
    public data: Table,
  ) {}

  getFieldElement(field: string) {
    return this.div.querySelector<HTMLDivElement>(
      `[data-table-field='${field}']`,
    )
  }

  render(data: Table) {
    this.data = data
    const { name, field_list } = data
    this.div.innerHTML = /* html */ `
<div class='table-title'>${name}</div>
<table>
  <tbody>
  ${field_list
    .map(({ name, type, is_null, is_primary_key, references }) => {
      const tags: string[] = []
      if (is_primary_key) {
        tags.push('PK')
      }
      if (references) {
        tags.push('FK')
      }
      const tag = tags.join(', ')
      const null_text = is_null ? 'NULL' : ''
      return /* html */ `
    <tr data-table-field='${name}'>
      <td class='table-field-tag'>${tag}</td>
      <td class='table-field-name'>${name}</td>
      <td class='table-field-type'>${type}</td>
      <td class='table-field-null'>${null_text}</td>
    </tr>
`
    })
    .join('')}
  </tbody>
</table>
</div>
`
  }

  renderTransform(diagramRect: ClientRect) {
    const x = this.translateX.toString()
    const y = this.translateY.toString()
    this.div.style.transform = `translate(${x}px,${y}px)`
    localStorage.setItem(`${this.data.name}-x`, x)
    localStorage.setItem(`${this.data.name}-y`, y)
    this.onMoveListenerSet.forEach(fn => fn(diagramRect))
  }

  renderLine(diagramRect: ClientRect) {
    const newLineMap = new Map<string, ForeignKeyReference>()

    this.data.field_list.forEach(field => {
      if (field.references) {
        newLineMap.set(field.name, field.references)
      }
    })

    // remove old lines
    this.lineMap.forEach((line, name) => {
      if (!newLineMap.has(name)) {
        this.removeLine(name, line)
      }
    })

    // add new line or update existing line
    newLineMap.forEach((reference, name) => {
      const lineController = this.lineMap.get(name)
      if (lineController) {
        lineController.render(diagramRect)
      } else {
        this.addLine(name, reference, diagramRect)
      }
    })
  }

  addLine(
    field: string,
    reference: ForeignKeyReference,
    diagramRect: ClientRect,
  ) {
    const fromDiv = this.getFieldElement(field)
    if (!fromDiv) return

    const toTable = this.diagram.tableMap.get(reference.table)
    if (!toTable) return
    const toDiv = toTable.getFieldElement(reference.field)
    if (!toDiv) return

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.diagram.div.appendChild(svg)

    const from: LineReference = { div: fromDiv, table: this }
    const to: LineReference = { div: toDiv, table: toTable }

    const controller = new LineController(svg, from, to)
    this.lineMap.set(field, controller)
    controller.render(diagramRect)
  }

  removeLine(field: string, line: LineController) {
    line.svg.remove()
    this.lineMap.delete(field)
  }

  remove() {
    this.div.remove()
    localStorage.removeItem(`${this.data.name}-x`)
    localStorage.removeItem(`${this.data.name}-y`)
  }
}

type LineReference = {
  div: HTMLDivElement
  table: TableController
}
class LineController {
  path = document.createElementNS('http://www.w3.org/2000/svg', 'path')

  constructor(
    public svg: SVGElement,
    public from: LineReference,
    public to: LineReference,
  ) {
    svg.appendChild(this.path)
    this.path.setAttributeNS(null, 'stroke', 'black')
    this.path.setAttributeNS(null, 'stroke-width', '1.5')
    this.path.setAttributeNS(null, 'fill', 'none')

    const render = this.render.bind(this)
    from.table.onMoveListenerSet.add(render)
    to.table.onMoveListenerSet.add(render)
  }

  render(diagramRect: ClientRect) {
    const fromRect = this.from.div.getBoundingClientRect()
    const f = {
      x: fromRect.x - diagramRect.left,
      y: fromRect.y - diagramRect.top,
    }
    const toRect = this.to.div.getBoundingClientRect()
    const t = {
      x: toRect.x - diagramRect.left,
      y: toRect.y - diagramRect.top,
    }
    this.path.setAttributeNS(null, 'd', `M${f.x} ${f.y} L ${t.x} ${t.y}`)
  }
}
