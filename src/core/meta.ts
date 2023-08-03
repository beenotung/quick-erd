export type Position = { x: number; y: number }
export type TablePositionColor = { x: number; y: number; color?: string }

export const zoomLineRegex = /# zoom: [0-9.]+/
export const zoomValueRegex = /# zoom: ([0-9.]+)/

export function zoomToLine(zoom: number): string {
  return `# zoom: ${zoom.toFixed(3)}`
}

export const viewLineRegex = /# view: \([0-9-]+, [0-9-]+\)/
export const viewPositionRegex = /# view: \(([0-9-.]+), ([0-9-.]+)\)/

export function viewToLine(view: Position) {
  const x = view.x.toFixed(0)
  const y = view.y.toFixed(0)
  return `# view: (${x}, ${y})`
}

export const tableNameRegex =
  /# (\w+) \(([0-9-]+), ([0-9-]+),? ?(#[0-9a-f]+)?\)/
export const tableNameRegex_g = new RegExp(
  tableNameRegex.toString().slice(1, -1),
  'g',
)

export function tableNameToRegex(name: string) {
  return new RegExp(`# ${name} \\([0-9-]+, [0-9-]+[, #0-9a-f]*\\)`)
}

export function tableNameToLine(name: string, position: TablePositionColor) {
  const x = position.x.toFixed(0)
  const y = position.y.toFixed(0)
  return position.color
    ? `# ${name} (${x}, ${y}, ${position.color})`
    : `# ${name} (${x}, ${y})`
}

export const textBgColorRegex = /# text-bg: (#\w+)/
export function textBgColorToLine(color: string): string {
  return `# text-bg: ${color}`
}

export const textColorRegex = /# text-color: (#\w+)/
export function textColorToLine(color: string): string {
  return `# text-color: ${color}`
}

export const diagramBgColorRegex = /# diagram-bg: (#\w+)/
export function diagramBgColorToLine(color: string): string {
  return `# diagram-bg: ${color}`
}

export const diagramTextColorRegex = /# diagram-text: (#\w+)/
export function diagramTextColorToLine(color: string): string {
  return `# diagram-text: ${color}`
}

export const tableBgColorRegex = /# table-bg: (#\w+)/
export function tableBgColorToLine(color: string): string {
  return `# table-bg: ${color}`
}

export const tableTextColorRegex = /# table-text: (#\w+)/
export function tableTextColorToLine(color: string): string {
  return `# table-text: ${color}`
}

export type ColorDict<T> = {
  textBgColor: T
  textColor: T
  diagramBgColor: T
  diagramTextColor: T
  tableBgColor: T
  tableTextColor: T
}

export const colors: ColorDict<{
  regex: RegExp
  toLine: (color: string) => string
}> = {
  textBgColor: { regex: textBgColorRegex, toLine: textBgColorToLine },
  textColor: { regex: textColorRegex, toLine: textColorToLine },
  diagramBgColor: { regex: diagramBgColorRegex, toLine: diagramBgColorToLine },
  diagramTextColor: {
    regex: diagramTextColorRegex,
    toLine: diagramTextColorToLine,
  },
  tableBgColor: { regex: tableBgColorRegex, toLine: tableBgColorToLine },
  tableTextColor: { regex: tableTextColorRegex, toLine: tableTextColorToLine },
}

export type ColorName = keyof typeof colors
