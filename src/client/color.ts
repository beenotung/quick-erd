import { InputController } from './input'

export class ColorController {
  textBgColor = new ColorInput(this.root, 'text-bg-color', {
    getEffectiveColor: () =>
      getComputedStyle(this.targets.editor).backgroundColor,
    onColorChanged: color => this.inputController.setTextBgColor(color),
  })
  textColor = new ColorInput(this.root, 'text-color', {
    getEffectiveColor: () => getComputedStyle(this.targets.input).color,
    onColorChanged: color => this.inputController.setTextColor(color),
  })
  diagramBgColor = new ColorInput(this.root, 'diagram-bg-color', {
    getEffectiveColor: () =>
      getComputedStyle(this.targets.diagram).backgroundColor,
    onColorChanged: color => this.inputController.setDiagramBgColor(color),
  })
  tableBgColor = new ColorInput(this.root, 'table-bg-color', {
    getEffectiveColor: () =>
      getComputedStyle(this.targets.tableStub).backgroundColor,
    onColorChanged: color => this.inputController.setTableBgColor(color),
  })
  tableTextColor = new ColorInput(this.root, 'table-text-color', {
    getEffectiveColor: () => getComputedStyle(this.targets.tableStub).color,
    onColorChanged: color => this.inputController.setTableTextColor(color),
  })
  inputs = [
    this.textBgColor,
    this.textColor,
    this.diagramBgColor,
    this.tableBgColor,
    this.tableTextColor,
  ]
  constructor(
    public root: HTMLElement,
    public targets: {
      editor: HTMLElement
      input: HTMLElement
      diagram: HTMLElement
      tableStub: HTMLElement
    },
    public inputController: InputController,
  ) {
    this.initInputValues()
  }
  resetColors() {
    for (let input of this.inputs) {
      input.reset()
    }
  }
  initInputValues() {
    for (let input of this.inputs) {
      input.initInputValue()
    }
  }
  flushToInputController() {
    for (let input of this.inputs) {
      input.flushToInputController()
    }
  }
}

class ColorInput {
  private defaultColor: string
  private propertyName: string
  private input: HTMLInputElement

  constructor(
    private root: HTMLElement,
    name: string,
    private io: {
      getEffectiveColor: () => string
      onColorChanged: (color: string) => void
    },
  ) {
    this.propertyName = '--' + name
    this.defaultColor = this.root.style.getPropertyValue(this.propertyName)
    this.input = this.root.querySelector('#' + name)!
    this.input.addEventListener('input', () => {
      this.setCSSVariable(this.input.value)
      this.io.onColorChanged(this.input.value)
    })
  }

  flushToInputController() {
    this.io.onColorChanged(this.input.value)
  }

  public setCSSVariable(color: string) {
    this.root.style.setProperty(this.propertyName, color)
  }

  public applyParsedColor(color: string) {
    this.input.value = decodeColor(color, this.defaultColor)
    this.setCSSVariable(this.input.value)
  }

  public reset() {
    this.setCSSVariable(this.defaultColor)
    this.initInputValue()
  }

  public initInputValue() {
    this.input.value = decodeColor(
      this.io.getEffectiveColor(),
      this.defaultColor,
    )
  }
}

export function decodeColor(color: string, defaultColor: string): string {
  let match = color.match(/^#\w+$/)
  if (match) return color

  console.log(color)
  match = color.match(/^rgb\((\w+)\s*,\s*(\w+)\s*,\s*(\w+)\)$/)
  if (match) {
    return '#' + toHex(match[1]) + toHex(match[2]) + toHex(match[3])
  }

  let span = document.createElement('span')
  span.style.color = defaultColor
  span.style.display = 'none'
  document.body.appendChild(span)
  let s = getComputedStyle(span).color
  span.remove()
  return decodeColor(s, defaultColor)
}

function toHex(int: string): string {
  let hex = (+int).toString(16)
  if (hex.length == 1) {
    return '0' + hex
  }
  return hex
}
