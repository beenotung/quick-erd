import { InputController } from './input'
const { random, floor } = Math

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
  randomTitleBgColor() {
    let { r, g, b } = this.tableBgColor.valueAsRGB
    let mean = (r + g + b) / 3
    return mean < 127 ? randomBrightColor() : randomDimColor()
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

  get valueAsRGB() {
    let color = decodeColor(this.input.value, this.defaultColor)
    let r = parseInt(color.slice(1, 3), 16)
    let g = parseInt(color.slice(3, 5), 16)
    let b = parseInt(color.slice(5, 7), 16)
    return { r, g, b }
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

function toHex(int: string | number): string {
  let hex = (+int).toString(16)
  if (hex.length == 1) {
    return '0' + hex
  }
  return hex
}

function randomDimHex() {
  return toHex(floor(random() * 100))
}

function randomBrightHex() {
  return toHex(floor(256 - random() * 100))
}

function randomDimColor() {
  const r = randomDimHex()
  const g = randomDimHex()
  const b = randomDimHex()
  return '#' + r + g + b
}

function randomBrightColor() {
  const r = randomBrightHex()
  const g = randomBrightHex()
  const b = randomBrightHex()
  return '#' + r + g + b
}