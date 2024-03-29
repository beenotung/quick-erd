import {
  ForeignKeyReference,
  ParseResult,
  RelationType,
  Table,
} from '../core/ast'
import { ColorController, calcTextColor } from './color'
import { querySelector } from './dom'
import { ErdInputController } from './erd-input'
import { StoredBoolean, StoredNumber, StoredString } from './storage'
import { QueryInputController } from './query-input'
import { Column } from '../core/query'
import { Position } from '../core/meta'
const { abs, sign, min, max } = Math

type Rect = {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

export class DiagramController {
  fontSizeSpan: HTMLSpanElement
  message: HTMLDivElement
  tablesContainer: TablesContainer
  controls: HTMLDivElement

  tableMap = new Map<string, TableController>()
  maxZIndex = 0
  zoom: StoredNumber
  barRadius: number

  isDetailMode = new StoredBoolean('is_detail_mode', true)

  isAutoMoving = false

  getSafeZIndex() {
    return (this.maxZIndex + 1) * 100
  }

  onMouseMove?: (ev: { clientX: number; clientY: number }) => void

  constructor(
    public div: HTMLDivElement,
    public inputController: ErdInputController,
    public colorController: ColorController,
    public queryController: QueryInputController,
    zoomLevel: StoredNumber,
    view: {
      x: StoredNumber
      y: StoredNumber
    },
  ) {
    this.barRadius = this.calcBarRadius()
    this.fontSizeSpan = this.querySelector('#font-size')
    this.message = this.querySelector('.message')
    this.tablesContainer = new TablesContainer(
      this,
      this.querySelector('#tables-container'),
      view,
    )
    this.controls = this.querySelector('.controls')
    this.zoom = zoomLevel
    this.div.addEventListener('mousemove', ev => {
      if (this.onMouseMove) {
        this.onMouseMove(ev)
      } else {
        this.tablesContainer.onMouseMove(ev)
      }
    })
    this.div.addEventListener('touchmove', ev => {
      const e = ev.touches.item(0)
      if (!e) return
      if (this.onMouseMove) {
        this.onMouseMove(e)
      } else {
        this.tablesContainer.onMouseMove(e)
      }
    })
    this.div.addEventListener('mouseup', () => {
      delete this.onMouseMove
    })
    this.div.addEventListener('touchend', () => {
      delete this.onMouseMove
    })

    this.controls
      .querySelector('#font-inc')
      ?.addEventListener('click', () => this.fontInc())
    this.controls
      .querySelector('#font-dec')
      ?.addEventListener('click', () => this.fontDec())

    this.applyFontSize()
  }

  private querySelector<T extends HTMLElement>(selector: string) {
    return querySelector<T>(this.div, selector)
  }

  remove(table: TableController) {
    table.remove()
    this.tableMap.delete(table.data.name)
  }

  getDiagramRect(): Rect {
    const rect = this.div.getBoundingClientRect()
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: this.div.scrollWidth,
      height: this.div.scrollHeight,
    }
  }

  getNewTablePosition(): Position {
    const rect = this.getDiagramRect()
    const view = {
      x: this.tablesContainer.view.x.value,
      y: this.tablesContainer.view.y.value,
    }
    return {
      x: (rect.right - rect.left) / 2 + view.x,
      y: (rect.bottom - rect.top) / 2 + view.y,
    }
  }

  calcBarRadius() {
    return +getComputedStyle(this.div).fontSize.replace('px', '') * 2.125
  }

  add(table: Table, diagramRect: Rect) {
    const tableDiv = document.createElement('div')
    tableDiv.dataset.table = table.name
    let isMouseDown = false
    let startX = 0
    let startY = 0
    const onMouseDown = (ev: { clientX: number; clientY: number }) => {
      this.maxZIndex++
      tableDiv.style.zIndex = this.maxZIndex.toString()
      isMouseDown = true
      startX = ev.clientX
      startY = ev.clientY
      this.onMouseMove = ev => {
        if (!isMouseDown) return
        controller.translateX.quickValue += ev.clientX - startX
        controller.translateY.quickValue += ev.clientY - startY
        startX = ev.clientX
        startY = ev.clientY
        controller.renderTransform(this.getDiagramRect())
      }
    }
    tableDiv.addEventListener('mousedown', ev => {
      onMouseDown(ev)
    })
    tableDiv.addEventListener('touchstart', ev => {
      const e = ev.touches.item(0)
      if (!e) return
      onMouseDown(e)
    })
    tableDiv.addEventListener('mouseup', () => {
      isMouseDown = false
    })
    tableDiv.addEventListener('touchend', () => {
      isMouseDown = false
    })
    this.tablesContainer.appendChild(tableDiv)

    const controller = new TableController(this, tableDiv, table)
    this.tableMap.set(table.name, controller)
    controller.render(table)
    controller.renderTransform(diagramRect)
    return controller
  }

  render({ table_list, view, zoom }: ParseResult) {
    // show or hide placeholder message
    if (table_list.length === 0) {
      this.message.style.display = 'inline-block'
    } else {
      this.message.style.display = 'none'
    }

    if (view) {
      this.tablesContainer.view.x.value = view.x
      this.tablesContainer.view.y.value = view.y
      this.tablesContainer.renderTransform('skip_storage')
    }

    if (zoom) {
      this.zoom.value = zoom
      this.applyFontSize('skip_storage')
    }

    const newTableMap = new Map(table_list.map(table => [table.name, table]))

    const removedTableControllers: TableController[] = []
    const newTableControllers: TableController[] = []

    // remove old table
    this.tableMap.forEach((table, name) => {
      if (!newTableMap.has(name)) {
        this.remove(table)
        removedTableControllers.push(table)
      }
    })

    const diagramRect = this.getDiagramRect()

    // add new tables or update existing tables
    newTableMap.forEach((table, name) => {
      let controller = this.tableMap.get(name)
      if (controller) {
        controller.render(table)
      } else {
        controller = this.add(table, diagramRect)
        newTableControllers.push(controller)
      }
    })

    // restore table color and position if renaming
    if (
      removedTableControllers.length === 1 &&
      newTableControllers.length === 1
    ) {
      this.renameTable(
        removedTableControllers[0],
        newTableControllers[0],
        diagramRect,
      )
    }

    // draw line
    this.tableMap.forEach(table => {
      table.renderLine(diagramRect)
    })

    this.controls.style.zIndex = this.getSafeZIndex().toString()
  }

  renameTable(
    oldTableController: TableController,
    newTableController: TableController,
    diagramRect: Rect,
  ) {
    newTableController.restoreMetadata(oldTableController)
    newTableController.renderTransform(diagramRect)

    const oldTableName = oldTableController.data.name
    const newTableName = newTableController.data.name
    this.queryController.renameTable(oldTableName, newTableName)

    this.tableMap.forEach(table => {
      table.data.field_list.forEach(field => {
        if (
          field.references?.table === oldTableName &&
          field.name === oldTableName + '_id'
        ) {
          const newFieldName = newTableName + '_id'
          this.inputController.renameField({
            fromTable: table.data.name,
            fromField: {
              oldName: field.name,
              newName: newFieldName,
            },
            toTable: {
              oldName: field.references.table,
              newName: newTableName,
            },
          })
          table.renameField(field.name, newFieldName)
          field.name = newFieldName
          field.references.table = newTableName
          table.render(table.data)
        }
      })
    })
  }

  renderLines() {
    const diagramRect = this.getDiagramRect()
    this.tableMap.forEach(table => {
      table.renderLine(diagramRect)
    })
  }

  autoPlace() {
    this.isAutoMoving = !this.isAutoMoving

    if (!this.isAutoMoving) return

    const tables: Array<{
      table: TableController
      rect: {
        top: number
        bottom: number
        left: number
        right: number
        force: { x: number; y: number }
        speed: { x: number; y: number }
      }
    }> = []
    this.tableMap.forEach(table => {
      const rect = table.div.getBoundingClientRect()
      tables.push({
        table,
        rect: {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          force: { x: 0, y: 0 },
          speed: { x: 0, y: 0 },
        },
      })
    })
    const diagramRect = this.getDiagramRect()

    const loop = () => {
      if (!this.isAutoMoving) return

      let isMoved = false

      tables.forEach(({ table, rect }) => {
        // calculate force from border
        rect.force.y =
          rect.top < diagramRect.top
            ? +1
            : rect.bottom > diagramRect.bottom
              ? -1
              : 0
        rect.force.x =
          rect.left < diagramRect.left
            ? +1
            : rect.right > diagramRect.right
              ? -1
              : 0

        // calculate force with other tables
        tables.forEach(other => {
          if (other.table === table) return
          if (isPointInside(other.rect, rect.left, rect.top)) {
            rect.force.x += 1
            rect.force.y += 1
          }
          if (isPointInside(other.rect, rect.right, rect.top)) {
            rect.force.x -= 1
            rect.force.y += 1
          }
          if (isPointInside(other.rect, rect.left, rect.bottom)) {
            rect.force.x += 1
            rect.force.y -= 1
          }
          if (isPointInside(other.rect, rect.right, rect.bottom)) {
            rect.force.x -= 1
            rect.force.y -= 1
          }
        })

        // apply force
        rect.speed.x += rect.force.x
        rect.speed.y += rect.force.y

        // check if need to move
        const minSpeed = 1
        if (
          Math.abs(rect.speed.x) < minSpeed &&
          Math.abs(rect.speed.y) < minSpeed
        ) {
          return
        }

        // move and render
        table.translateX.quickValue += rect.speed.x
        table.translateY.quickValue += rect.speed.y
        table.quickRenderTransform(diagramRect)
        isMoved = true

        // update new position
        rect.left += rect.speed.x
        rect.right += rect.speed.x
        rect.top += rect.speed.y
        rect.bottom += rect.speed.y

        // apply friction
        rect.speed.x *= 0.95
        rect.speed.y *= 0.95
      })

      if (!isMoved) {
        this.isAutoMoving = false
        tables.forEach(({ table }) => table.saveTransform())
        return
      }

      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  toggleDetails() {
    this.isDetailMode.value = !this.isDetailMode.value
    const diagramRect = this.getDiagramRect()
    this.tableMap.forEach(table => {
      table.rerenderColumns()
      table.renderLine(diagramRect)
    })
  }

  applyFontSize(mode?: 'skip_storage') {
    const fontSize = this.zoom.value
    if (mode !== 'skip_storage') {
      this.inputController.setZoom(fontSize)
    }
    this.fontSizeSpan.textContent = (fontSize * 100).toFixed(0) + '%'
    this.div.style.fontSize = fontSize + 'em'
    this.barRadius = this.calcBarRadius()
    const diagramRect = this.getDiagramRect()
    this.tableMap.forEach(table => {
      table.renderLine(diagramRect)
    })
  }
  calcFontStep() {
    return Math.min(this.zoom.value * 0.1, 0.25)
  }
  setFont(zoom: number) {
    this.zoom.value = zoom
    this.applyFontSize()
  }
  fontInc() {
    this.setFont(this.zoom.value + this.calcFontStep())
  }
  fontDec() {
    this.setFont(this.zoom.value - this.calcFontStep())
  }
  fontReset() {
    this.setFont(1)
  }
  resetView() {
    this.isAutoMoving = false
    this.fontReset()
    this.tablesContainer.resetView()
  }
  randomColor() {
    this.tableMap.forEach(tableController => {
      tableController.randomColor()
    })
  }
  resetColor() {
    this.tableMap.forEach(tableController => {
      tableController.resetColor()
    })
    this.inputController.resetColor()
  }
  exportJSON(json: any) {
    json.zoom = this.zoom.value
    this.tablesContainer.exportJSON(json)
    this.tableMap.forEach(table => {
      table.exportJSON(json)
    })
  }
  flushToInputController() {
    this.inputController.setZoom(this.zoom.value)
    this.inputController.setViewPosition({
      x: this.tablesContainer.view.x.value,
      y: this.tablesContainer.view.y.value,
    })
    for (const [name, table] of this.tableMap) {
      this.inputController.setTablePosition(name, {
        x: table.translateX.value,
        y: table.translateY.value,
        color: table.color.value,
      })
    }
  }

  getTableList(): ParseResult['table_list'] {
    return Array.from(this.tableMap.values(), table => table.data)
  }

  applySelectedColumns(columns: Column[]) {
    const tableFields = new Map<string, string[]>()
    columns.forEach(column => {
      const fields = tableFields.get(column.table)
      if (fields) {
        fields.push(column.field)
      } else {
        tableFields.set(column.table, [column.field])
      }
    })
    this.tableMap.forEach(table => {
      table.applySelectedFields(tableFields.get(table.data.name) || [])
    })
  }
}

export class TablesContainer {
  onMouseMove: (ev: { clientX: number; clientY: number }) => void

  constructor(
    public diagram: DiagramController,
    public div: HTMLDivElement,
    public view: {
      x: StoredNumber
      y: StoredNumber
    },
  ) {
    this.div.style.transform = `translate(${-view.x}px,${-view.y}px)`
    this.diagram.inputController.setViewPosition({
      x: view.x.value,
      y: view.y.value,
    })

    let isMouseDown = false
    let startX = 0
    let startY = 0
    this.onMouseMove = ev => {
      if (!isMouseDown) return

      view.x.value -= ev.clientX - startX
      view.y.value -= ev.clientY - startY

      startX = ev.clientX
      startY = ev.clientY

      this.renderTransform()
    }
    const onMouseDown = (ev: { clientX: number; clientY: number }) => {
      isMouseDown = true
      startX = ev.clientX
      startY = ev.clientY
    }
    const container = this.diagram.div
    container.addEventListener('mousedown', ev => {
      onMouseDown(ev)
    })
    container.addEventListener('touchstart', ev => {
      const e = ev.touches.item(0)
      if (!e) return
      onMouseDown(e)
    })
    container.addEventListener('mouseup', () => {
      isMouseDown = false
    })
    container.addEventListener('touchend', () => {
      isMouseDown = false
    })
  }

  appendChild(node: Node) {
    this.div.appendChild(node)
  }

  renderTransform(mode?: 'skip_storage') {
    const { x, y } = this.view
    if (mode != 'skip_storage') {
      this.diagram.inputController.setViewPosition({
        x: x.value,
        y: y.value,
      })
    }
    this.div.style.transform = `translate(${-x}px,${-y}px)`
    const diagramRect = this.diagram.getDiagramRect()
    this.diagram.tableMap.forEach(tableController =>
      tableController.renderLinesTransform(diagramRect),
    )
  }

  resetView() {
    this.view.x.value = 0
    this.view.y.value = 0
    this.renderTransform()
  }

  exportJSON(json: any) {
    json['view:x'] = this.view.x
    json['view:y'] = this.view.y
  }
}

type RectCorner = {
  left: number
  right: number
  top: number
  bottom: number
}

function isPointInside(rect: RectCorner, x: number, y: number): boolean {
  return rect.left <= x && x <= rect.right && rect.top <= y && y <= rect.bottom
}

class TableController {
  translateX: StoredNumber
  translateY: StoredNumber
  color: StoredString
  // self_field + table + other_field -> line
  _lineMap = new Map<string, LineController>()
  reverseLineSet = new Set<LineController>()

  onMoveListenerSet = new Set<(diagramRect: Rect) => void>()

  tableHeader: HTMLDivElement
  colorInput: HTMLInputElement
  tbody: HTMLTableSectionElement
  fieldMap = new Map<string, HTMLTableRowElement>()
  fieldCheckboxes = new Map<string, HTMLInputElement>()
  addFieldButton: HTMLButtonElement

  toFieldKey(own_field: string, table: string, other_field: string) {
    return `${own_field}:${table}.${other_field}`
  }

  getLine(own_field: string, table: string, other_field: string) {
    const key = this.toFieldKey(own_field, table, other_field)
    return this._lineMap.get(key)
  }
  setLine(
    own_field: string,
    table: string,
    other_field: string,
    line: LineController,
  ) {
    const key = this.toFieldKey(own_field, table, other_field)
    this._lineMap.set(key, line)
  }

  constructor(
    public diagram: DiagramController,
    public div: HTMLDivElement,
    public data: Table,
  ) {
    const newTablePosition = diagram.getNewTablePosition()
    this.translateX = new StoredNumber(this.data.name + '-x', 0)
    this.translateY = new StoredNumber(this.data.name + '-y', 0)
    if (this.translateX.value == 0 && this.translateY.value == 0) {
      this.translateX.value = newTablePosition.x
      this.translateY.value = newTablePosition.y
    }
    this.color = new StoredString(this.data.name + '-color', '')

    this.div.addEventListener('mouseenter', () => {
      const diagramRect = this.diagram.getDiagramRect()
      this.renderLinesTransform(diagramRect)
    })
    this.div.addEventListener('mouseleave', () => {
      const diagramRect = this.diagram.getDiagramRect()
      this.renderLinesTransform(diagramRect)
    })

    this.div.innerHTML = /* html */ `
<div class='table-header'>
  <div class='table-name'>${this.data.name}</div>
  <div class='table-color-container'><input type='color'></div>
</div>
<table>
  <tbody></tbody>
</table>
<div class='table-footer'>
  <button class='add-field-button' title='add column'>+</button>
</div>
</div>
`
    this.tableHeader = this.div.querySelector('.table-header') as HTMLDivElement
    this.tableHeader.addEventListener('contextmenu', event => {
      event.preventDefault()
      this.diagram.inputController.selectTable(this.data.name)
    })
    this.colorInput = this.tableHeader.querySelector(
      'input[type=color]',
    ) as HTMLInputElement
    this.colorInput.addEventListener('input', () => {
      const color = this.colorInput.value
      this.color.value = color
      this.tableHeader.style.backgroundColor = color
      this.tableHeader.style.color = calcTextColor(color)
      this.diagram.inputController.setTablePosition(this.data.name, {
        x: this.translateX.value,
        y: this.translateY.value,
        color,
      })
    })

    this.tbody = this.div.querySelector('tbody') as HTMLTableSectionElement

    this.addFieldButton = this.div.querySelector(
      '.add-field-button',
    ) as HTMLButtonElement
    this.addFieldButton.addEventListener('click', () => {
      const lastField =
        this.data.field_list[this.data.field_list.length - 1]?.name
      if (!lastField) {
        this.showAddFieldMessage('Error: last field not detected')
      } else {
        this.diagram.inputController.addField(this.data.name, lastField)
        this.showAddFieldMessage('(please input new column)')
      }
    })
  }

  showAddFieldMessage(message: string) {
    this.addFieldButton.textContent = message
    this.addFieldButton.classList.add('message-mode')
    setTimeout(() => {
      this.addFieldButton.textContent = '+'
      this.addFieldButton.classList.remove('message-mode')
    }, 3500)
  }

  getFieldElement(field: string) {
    return this.fieldMap.get(field)
  }

  renameField(oldName: string, newName: string) {
    const tr = this.fieldMap.get(oldName)
    if (!tr) throw new Error('field not found, name: ' + oldName)
    this.fieldMap.delete(oldName)
    this.fieldMap.set(newName, tr)
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
      ({ name, type, is_null, is_primary_key, references, is_unique }) => {
        const tags: string[] = []
        const icons: string[] = []
        if (is_primary_key) {
          tags.push('<span title="primary key">PK</span>')
          icons.push(
            `<img title="primary key" class="icon" src="/icons/key-outline.svg">`,
          )
        }
        if (references) {
          tags.push('<span title="foreign key">FK</span>')
          icons.push(
            `<img title="foreign key" class="icon" src="/icons/attach-outline.svg">`,
          )
        }
        if (is_unique) {
          tags.push('<span title="unique">UQ</span>')
          icons.push(
            `<img title="unique" class="icon" src="/icons/snow-outline.svg">`,
          )
        }

        const mode =
          navigator.userAgent.includes('Mac OS') ||
          navigator.userAgent.includes('Macintosh') ||
          navigator.userAgent.includes('iPhone') ||
          navigator.userAgent.includes('iPad')
            ? 'icon'
            : 'text'

        const tag = mode == 'icon' ? icons.join('') : tags.join(', ')
        const null_text = is_null ? 'NULL' : ''

        let tr = this.fieldMap.get(name)
        if (!tr) {
          tr = document.createElement('tr')
          tr.dataset.tableField = name
          tr.addEventListener('contextmenu', event => {
            event.preventDefault()
            this.diagram.inputController.selectField(data.name, name)
          })
          this.fieldMap.set(name, tr)
        }

        tr.hidden = !this.diagram.isDetailMode.value && tags.length === 0

        tr.innerHTML = /* html */ `
  <td class='table-field-tag'>${tag}</td>
  <td class='table-field-name'>
    <label>
      <input type='checkbox'>
      ${name}
    </label>
  </td>
  <td class='table-field-type'>${type}</td>
  <td class='table-field-null'>${null_text}</td>
`
        if (type.match(/^enum\(/i)) {
          const td =
            tr.querySelector<HTMLTableCellElement>('.table-field-type')!
          td.title = type
          td.textContent = 'enum'
        }

        const checkbox = tr.querySelector(
          'input[type=checkbox]',
        ) as HTMLInputElement

        checkbox.checked = this.diagram.queryController.hasColumn(
          this.data.name,
          name,
        )

        checkbox.onchange = () => {
          try {
            if (checkbox.checked) {
              this.diagram.queryController.addColumn(this.data.name, name)
            } else {
              this.diagram.queryController.removeColumn(this.data.name, name)
            }
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.match(/Table .* not found/)
            ) {
              this.diagram.queryController.cleanColumns()
              return
            }
            console.error(error)
          }
        }

        this.fieldCheckboxes.set(name, checkbox)

        this.tbody.appendChild(tr)
      },
    )

    // apply position from erd text
    if (
      data.position &&
      (data.position.x != this.translateX.value ||
        data.position.y != this.translateY.value)
    ) {
      this.translateX.quickValue = data.position.x
      this.translateY.quickValue = data.position.y

      this.tableHeader.style.backgroundColor = data.position.color || ''
      this.renderTransform(this.diagram.getDiagramRect())
    }

    // apply table color from erd text
    const color = data.position?.color || ''
    this.color.quickValue = color
    this.colorInput.value = color
    this.tableHeader.style.backgroundColor = color
  }

  randomColor() {
    const color = this.diagram.colorController.randomTitleBgColor()
    this.applyColor(color)
  }

  resetColor() {
    this.applyColor('')
  }

  applyColor(color: string) {
    this.color.value = color
    this.colorInput.value = color
    this.tableHeader.style.backgroundColor = color
    this.diagram.inputController.setTablePosition(this.data.name, {
      x: this.data.position?.x || this.translateX.quickValue,
      y: this.data.position?.y || this.translateY.quickValue,
      color,
    })
  }

  rerenderColumns() {
    this.data.field_list.forEach(field => {
      if (field.is_primary_key || field.references) return
      const tr = this.fieldMap.get(field.name)
      if (!tr) return
      tr.hidden = !this.diagram.isDetailMode.value
    })
  }

  renderTransform(diagramRect: Rect) {
    const x = this.translateX.toString()
    const y = this.translateY.toString()
    this.div.style.transform = `translate(${x}px,${y}px)`
    this.onMoveListenerSet.forEach(fn => fn(diagramRect))
    this.saveTransform()
  }

  quickRenderTransform(diagramRect: Rect) {
    const x = this.translateX.toString()
    const y = this.translateY.toString()
    this.div.style.transform = `translate(${x}px,${y}px)`
    this.onMoveListenerSet.forEach(fn => fn(diagramRect))
  }

  saveTransform() {
    const { name } = this.data
    const x = this.translateX
    const y = this.translateY
    const color = this.color
    x.save()
    y.save()
    color.save()
    this.diagram.inputController.setTablePosition(name, {
      x: x.value,
      y: y.value,
      color: color.value,
    })
  }

  renderLinesTransform(diagramRect: Rect) {
    this._lineMap.forEach(lineController => lineController.render(diagramRect))
  }

  renderLine(diagramRect: Rect) {
    const newFieldRefMap = new Map<string, ForeignKeyReference>()

    this.data.field_list.forEach(field => {
      if (field.references) {
        newFieldRefMap.set(field.name, field.references)
      }
    })

    // remove old lines
    this._lineMap.forEach((line, key) => {
      if (!newFieldRefMap.has(key)) {
        this.removeLine(key, line)
      }
    })

    // add new line or update existing line
    newFieldRefMap.forEach((reference, field) => {
      const lineController = this.getLine(
        field,
        reference.table,
        reference.field,
      )
      if (lineController) {
        lineController.relation = reference.type
        lineController.render(diagramRect)
      } else {
        this.addLine(field, reference, diagramRect)
      }
    })
  }

  addLine(field: string, reference: ForeignKeyReference, diagramRect: Rect) {
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
    this.setLine(field, reference.table, reference.field, controller)
    controller.render(diagramRect)
  }

  removeLine(key: string, line: LineController) {
    line.svg.remove()
    this._lineMap.delete(key)
  }

  remove() {
    this.div.remove()
    this._lineMap.forEach(line => line.remove())
    this._lineMap.clear()
    this.fieldMap.clear()
    // eslint-disable-next-line no-constant-condition
    if (!'preserve metadata') {
      this.translateX.remove()
      this.translateY.remove()
      this.color.remove()
    }
    this.diagram.inputController.removeTable(this.data.name)
  }

  exportJSON(json: any) {
    const name = this.data.name
    json[name + '-x'] = this.translateX
    json[name + '-y'] = this.translateY
  }

  applySelectedFields(fields: string[]) {
    this.fieldCheckboxes.forEach((checkbox, field) => {
      checkbox.checked = fields.includes(field)
    })
  }

  getSelectedFields() {
    const fields: string[] = []
    this.fieldCheckboxes.forEach((checkbox, field) => {
      if (checkbox.checked) {
        fields.push(field)
      }
    })
    return fields
  }

  restoreMetadata(ref: TableController) {
    this.applyColor(ref.color.value)

    this.translateX.value = ref.translateX.value
    this.translateY.value = ref.translateY.value

    this.applySelectedFields(ref.getSelectedFields())
  }
}

type LineReference = {
  table: TableController
  field: string
}
class LineController {
  line: SVGPathElement
  head: SVGPathElement
  tail: SVGPathElement

  constructor(
    public diagram: DiagramController,
    public svg: SVGElement,
    public from: LineReference,
    public to: LineReference,
    public relation: RelationType,
  ) {
    this.line = this.makePath()
    this.head = this.makePath()
    this.tail = this.makePath()
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

  render(diagramRect: Rect) {
    requestAnimationFrame(() => {
      const div = this.diagram.div
      const offsetX = div.scrollLeft
      const offsetY = div.scrollTop
      this.svg.style.left = offsetX + 'px'
      this.svg.style.top = offsetY + 'px'
    })
    const fromDiv = this.from.table.getFieldElement(this.from.field)
    if (!fromDiv) return
    const toDiv = this.to.table.getFieldElement(this.to.field)
    if (!toDiv) return

    const fromRect = fromDiv.getBoundingClientRect()
    const toRect = toDiv.getBoundingClientRect()

    const barRadius = this.diagram.barRadius
    const gap = barRadius / 2
    const margin = gap * 2

    const from_y = fromRect.top + fromRect.height / 2 - diagramRect.top
    const to_y = toRect.top + toRect.height / 2 - diagramRect.top

    let from_x: number
    let to_x: number

    let from_bar_x: number
    let from_margin_x: number
    let to_margin_x: number
    let to_bar_x: number

    let from_bar_border_x: number
    let to_bar_border_x: number

    if (fromRect.right + gap < toRect.left - gap) {
      /**
       * [from]---[to]
       */
      from_x = fromRect.right - diagramRect.left
      to_x = toRect.left - diagramRect.left

      from_bar_x = from_x + gap
      from_margin_x = from_x + margin
      to_margin_x = to_x - margin
      to_bar_x = to_x - gap

      from_bar_border_x = from_x + gap
      to_bar_border_x = to_x - gap
    } else if (toRect.right + gap < fromRect.left - gap) {
      /**
       * [to]---[from]
       */
      from_x = fromRect.left - diagramRect.left
      to_x = toRect.right - diagramRect.left

      from_bar_x = from_x - gap
      from_margin_x = from_x - margin
      to_margin_x = to_x + margin
      to_bar_x = to_x + gap

      from_bar_border_x = from_x - gap
      to_bar_border_x = to_x + gap
    } else {
      const right_dist = abs(fromRect.right - toRect.right)
      const left_dist = abs(fromRect.left - toRect.left)
      if (right_dist < left_dist) {
        /**
         * [from]-
         *        \
         *        |
         *        /
         *   [to]-
         */
        from_x = fromRect.right - diagramRect.left
        to_x = toRect.right - diagramRect.left

        const edge_x = max(from_x, to_x)

        from_bar_x = edge_x + gap
        from_margin_x = edge_x + margin
        to_margin_x = edge_x + margin
        to_bar_x = edge_x + gap

        from_bar_border_x = from_x + gap
        to_bar_border_x = to_x + gap
      } else {
        /**
         *  -[from]
         * /
         * |
         * \
         *  -[to]
         */
        from_x = fromRect.left - diagramRect.left
        to_x = toRect.left - diagramRect.left

        const edge_x = min(from_x, to_x)

        from_bar_x = edge_x - gap
        from_margin_x = edge_x - margin
        to_margin_x = edge_x - margin
        to_bar_x = edge_x - gap

        from_bar_border_x = from_x - gap
        to_bar_border_x = to_x - gap
      }
    }

    let path = ''

    // from field
    path += ` M ${from_x} ${from_y}`
    path += ` L ${from_bar_x} ${from_y}`

    // relation link
    path += `C ${from_margin_x} ${from_y}`
    path += `  ${to_margin_x} ${to_y}`
    path += `  ${to_bar_x} ${to_y}`

    // to field
    path += ` L ${to_x} ${to_y}`

    this.line.setAttributeNS(null, 'd', path.trim())

    const relation = this.relation
    const first = relation[0]
    const last = relation[this.relation.length - 1]

    renderRelationBar({
      path: this.head,
      from_x,
      from_y,
      border_x: from_bar_border_x,
      barRadius,
      type: relation.startsWith('>0')
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
      from_x: to_x,
      from_y: to_y,
      border_x: to_bar_border_x,
      barRadius,
      type: relation.endsWith('0<')
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
