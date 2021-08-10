import { ForeignKeyReference, ParseResult, RelationType, Table } from './ast'
const { random, floor, abs, sign } = Math

export class DiagramController {
  message = this.div.querySelector('.message') as HTMLDivElement
  tableMap = new Map<string, TableController>()
  maxZIndex = 0
  fontSize = 1
  barRadius = this.calcBarRadius()

  controls = this.div.querySelector('.controls') as HTMLDivElement

  getSafeZIndex() {
    return (this.maxZIndex + 1) * 100
  }

  onMouseMove?: (ev: MouseEvent) => void

  constructor(
    public div: HTMLDivElement,
    public fontSizeSpan: HTMLSpanElement,
  ) {
    this.div.addEventListener('mousemove', ev => {
      this.onMouseMove?.(ev)
    })
    this.div.addEventListener('mouseup', () => {
      delete this.onMouseMove
    })

    this.controls
      .querySelector('#font-inc')
      ?.addEventListener('click', () => this.fontInc())
    this.controls
      .querySelector('#font-dec')
      ?.addEventListener('click', () => this.fontDec())
  }

  remove(table: TableController) {
    table.remove()
    this.tableMap.delete(table.data.name)
  }

  getDiagramRect() {
    return this.div.getBoundingClientRect()
  }

  calcBarRadius() {
    return +getComputedStyle(this.div).fontSize.replace('px', '') * 2.125
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
      this.message.style.display = 'inline-block'
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

    this.controls.style.zIndex = this.getSafeZIndex().toString()
  }

  autoPlace() {
    const tableRectMap = new Map<TableController, ClientRect>()
    this.tableMap.forEach(table => {
      const rect = table.div.getBoundingClientRect()
      tableRectMap.set(table, rect)
    })
    const diagramRect = this.getDiagramRect()

    const timeout = Date.now() + 2000
    for (let isMoved = true; isMoved; ) {
      isMoved = false
      if (Date.now() > timeout) break

      tableRectMap.forEach((rect, table) => {
        tableRectMap.forEach((otherRect, otherTable) => {
          if (table === otherTable) return
          if (!isRectCollide(rect, otherRect)) return
          const exploreRect = { ...rect }
          let offsetX = 0
          let offsetY = 0
          for (;;) {
            if (Date.now() > timeout) break
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

  adjustFontSize() {
    this.fontSizeSpan.textContent = (this.fontSize * 100).toFixed(0) + '%'
    this.div.style.fontSize = this.fontSize + 'em'
    this.barRadius = this.calcBarRadius()
    const diagramRect = this.getDiagramRect()
    this.tableMap.forEach(table => {
      table.renderLine(diagramRect)
    })
  }
  calcFontStep() {
    return Math.min(this.fontSize * 0.1, 0.25)
  }
  fontInc() {
    this.fontSize += this.calcFontStep()
    this.adjustFontSize()
  }
  fontDec() {
    this.fontSize -= this.calcFontStep()
    this.adjustFontSize()
  }
  fontReset() {
    this.fontSize = 1
    this.adjustFontSize()
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

  tbody: HTMLTableSectionElement
  fieldMap = new Map<string, HTMLTableRowElement>()

  constructor(
    public diagram: DiagramController,
    public div: HTMLDivElement,
    public data: Table,
  ) {
    this.div.innerHTML = /* html */ `
<div class='table-title'>${data.name}</div>
<table>
  <tbody></tbody>
</table>
</div>
`
    this.tbody = this.div.querySelector('tbody') as HTMLTableSectionElement
  }

  getFieldElement(field: string) {
    return this.div.querySelector<HTMLDivElement>(
      `[data-table-field='${field}']`,
    )
  }

  render(data: Table) {
    this.data = data

    const newFieldSet = new Set<string>()
    data.field_list.forEach(field => newFieldSet.add(field.name))

    // remove old fields
    this.fieldMap.forEach((field, name) => {
      if (!newFieldSet.has(name)) {
        field.remove()
        this.fieldMap.delete(name)
      }
    })

    // add new fields or update existing fields
    data.field_list.forEach(
      ({ name, type, is_null, is_primary_key, references }) => {
        const tags: string[] = []
        if (is_primary_key) {
          tags.push('PK')
        }
        if (references) {
          tags.push('FK')
        }
        const tag = tags.join(', ')
        const null_text = is_null ? 'NULL' : ''

        let tr = this.div.querySelector(
          `[data-table-field='${name}']`,
        ) as HTMLTableRowElement
        if (!tr) {
          tr = document.createElement('tr')
          tr.dataset.tableField = name
          this.fieldMap.set(name, tr)
        }

        tr.innerHTML = /* html */ `
  <td class='table-field-tag'>${tag}</td>
  <td class='table-field-name'>${name}</td>
  <td class='table-field-type'>${type}</td>
  <td class='table-field-null'>${null_text}</td>
`
        this.tbody.appendChild(tr)
      },
    )
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
        lineController.relation = reference.type
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

    const from: LineReference = { field, table: this }
    const to: LineReference = { field: reference.field, table: toTable }

    const controller = new LineController(
      this.diagram,
      svg,
      from,
      to,
      reference.type,
    )
    this.lineMap.set(field, controller)
    controller.render(diagramRect)
  }

  removeLine(field: string, line: LineController) {
    line.svg.remove()
    this.lineMap.delete(field)
  }

  remove() {
    this.div.remove()
    this.lineMap.forEach(line => line.remove())
    this.lineMap.clear()
    this.fieldMap.clear()
    localStorage.removeItem(`${this.data.name}-x`)
    localStorage.removeItem(`${this.data.name}-y`)
  }
}

type LineReference = {
  table: TableController
  field: string
}
class LineController {
  line = this.makePath()
  head = this.makePath()
  tail = this.makePath()

  constructor(
    public diagram: DiagramController,
    public svg: SVGElement,
    public from: LineReference,
    public to: LineReference,
    public relation: RelationType,
  ) {
    this.render = this.render.bind(this)
    from.table.onMoveListenerSet.add(this.render)
    to.table.onMoveListenerSet.add(this.render)
  }

  makePath() {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttributeNS(null, 'stroke', 'black')
    path.setAttributeNS(null, 'stroke-width', '1.5')
    path.setAttributeNS(null, 'fill', 'none')
    this.svg.appendChild(path)
    return path
  }

  remove() {
    this.svg.remove()
    this.from.table.onMoveListenerSet.delete(this.remove)
    this.to.table.onMoveListenerSet.delete(this.remove)
  }

  render(diagramRect: ClientRect) {
    const fromDiv = this.from.table.getFieldElement(this.from.field)
    if (!fromDiv) return
    const toDiv = this.to.table.getFieldElement(this.to.field)
    if (!toDiv) return

    const fromRect = fromDiv.getBoundingClientRect()
    const toRect = toDiv.getBoundingClientRect()

    type Config = {
      from: number
      to: number
      distance: number
    }

    function toConfig(from: number, to: number): Config {
      return {
        from,
        to,
        distance: abs(from - to),
      }
    }

    const config_list: Config[] = [
      toConfig(fromRect.left, toRect.left),
      toConfig(fromRect.right, toRect.right),
      toConfig(fromRect.left, toRect.right),
      toConfig(fromRect.right, toRect.left),
    ]

    const { from, to } = config_list.sort((a, b) => a.distance - b.distance)[0]

    // from edge
    const f_x = from - diagramRect.left
    const f_y = fromRect.top + fromRect.height / 2 - diagramRect.top

    // to edge
    const t_x = to - diagramRect.left
    const t_y = toRect.top + toRect.height / 2 - diagramRect.top

    let f_b_x: number // from bar
    let f_b2_x: number // from bar
    let f_m_x: number // from margin

    const barRatio = 1 / 2
    const marginRatio = barRatio * 2
    const barRadius = this.diagram.barRadius

    if (from === fromRect.left) {
      // start from left
      f_b_x = f_x - barRadius * barRatio
      f_b2_x = f_x - (barRadius * barRatio) / 3
      f_m_x = f_x - barRadius * marginRatio
    } else {
      // start from right
      f_b_x = f_x + barRadius * barRatio
      f_b2_x = f_x + (barRadius * barRatio) / 3
      f_m_x = f_x + barRadius * marginRatio
    }

    let t_b_x: number // to bar
    let t_b2_x: number // to bar
    let t_m_x: number // to margin
    if (to === toRect.left) {
      // end from left
      t_b_x = t_x - barRadius * barRatio
      t_b2_x = t_x - (barRadius * barRatio) / 3
      t_m_x = t_x - barRadius * marginRatio
    } else {
      // end from right
      t_b_x = t_x + barRadius * barRatio
      t_b2_x = t_x + (barRadius * barRatio) / 3
      t_m_x = t_x + barRadius * marginRatio
    }

    const first = this.relation[0]
    const last = this.relation[this.relation.length - 1]
    const skipHead = this.relation.startsWith('>0') || first === '0'
    const skipTail = this.relation.endsWith('0<') || last === '0'
    {
      const headPath = skipHead
        ? `M ${f_x} ${f_y} L ${f_b2_x} ${f_y} M ${f_b_x} ${f_y}`
        : `M ${f_x} ${f_y} L ${f_b_x} ${f_y}`
      const linePath = `C ${f_m_x} ${f_y} ${t_m_x} ${t_y} ${t_b_x} ${t_y}`
      const tailPath = skipTail
        ? `M ${t_b2_x} ${t_y} L ${t_x} ${t_y}`
        : `L ${t_x} ${t_y}`
      this.line.setAttributeNS(null, 'd', `${headPath} ${linePath} ${tailPath}`)
    }

    renderRelationBar({
      path: this.head,
      from_x: f_x,
      from_y: f_y,
      border_x: f_b_x,
      barRadius: barRadius,
      type: this.relation.startsWith('>0')
        ? 'zero-or-many'
        : first === '>'
        ? 'many'
        : first === '0'
        ? 'zero'
        : first === '-'
        ? 'one'
        : 'default',
    })

    renderRelationBar({
      path: this.tail,
      from_x: t_x,
      from_y: t_y,
      border_x: t_b_x,
      barRadius: barRadius,
      type: this.relation.endsWith('0<')
        ? 'zero-or-many'
        : last === '<'
        ? 'many'
        : last === '0'
        ? 'zero'
        : last === '-'
        ? 'one'
        : 'default',
    })
  }
}

type RelationBarType = 'many' | 'one' | 'zero' | 'zero-or-many' | 'default'
function renderRelationBar({
  path,
  from_x: f_x,
  from_y: f_y,
  border_x: b_x,
  barRadius,
  type,
}: {
  path: SVGPathElement
  from_x: number
  from_y: number
  border_x: number
  barRadius: number
  type: RelationBarType
}) {
  // arrow
  const a_x = b_x - (b_x - f_x) / 3
  const a_t = f_y - barRadius / 4
  const a_b = f_y + barRadius / 4

  switch (type) {
    case 'many':
      path.setAttributeNS(
        null,
        'd',
        `M ${a_x} ${f_y} L ${f_x} ${a_t} M ${a_x} ${f_y} L ${f_x} ${a_b}`,
      )
      break
    case 'one':
      path.setAttributeNS(null, 'd', `M ${a_x} ${a_t} V ${a_b}`)
      break
    case 'zero': {
      const r = (a_t - a_b) / 3
      const x = b_x
      path.setAttributeNS(
        null,
        'd',
        `M ${x} ${f_y} A ${r} ${r} 0 1 0 ${x} ${f_y - 0.001 * sign(f_x - a_x)}`,
      )
      break
    }
    case 'zero-or-many': {
      const r = (a_t - a_b) / 5
      const x = b_x
      path.setAttributeNS(
        null,
        'd',
        `M ${x} ${f_y} A ${r} ${r} 0 1 0 ${x} ${f_y - 0.001 * sign(f_x - a_x)}
         M ${a_x} ${f_y} L ${f_x} ${a_t}
         M ${a_x} ${f_y} L ${f_x} ${a_b}
         M ${a_x} ${f_y} L ${f_x} ${f_y}
        `,
      )
      break
    }
    default:
      path.setAttributeNS(null, 'd', ``)
  }
}
