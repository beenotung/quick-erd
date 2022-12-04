export type Position = { x: number; y: number }

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

export const tableNameRegex = /# (\w+) \(([0-9-.]+), ([0-9-.]+)\)/
export const tableNameRegex_g = new RegExp(
  tableNameRegex.toString().slice(1, -1),
  'g',
)

export function tableNameToRegex(name: string) {
  return new RegExp(`# ${name} \\([0-9-]+, [0-9-]+\\)`)
}

export function tableNameToLine(name: string, position: Position) {
  const x = position.x.toFixed(0)
  const y = position.y.toFixed(0)
  return `# ${name} (${x}, ${y})`
}
