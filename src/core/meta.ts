export type Position = { x: number; y: number }

export let zoomLineRegex = /# zoom: [0-9.]+/
export let zoomValueRegex = /# zoom: ([0-9.]+)/

export function zoomToLine(zoom: number): string {
  return `# zoom: ${zoom.toFixed(3)}`
}

export let viewLineRegex = /# view: \([0-9-]+, [0-9-]+\)/
export let viewPositionRegex = /# view: \(([0-9-.]+), ([0-9-.]+)\)/

export function viewToLine(view: Position) {
  let x = view.x.toFixed(0)
  let y = view.y.toFixed(0)
  return `# view: (${x}, ${y})`
}

export let tableNameRegex = /# (\w+) \(([0-9-.]+), ([0-9-.]+)\)/
export let tableNameRegex_g = new RegExp(
  tableNameRegex.toString().slice(1, -1),
  'g',
)

export function tableNameToRegex(name: string) {
  return new RegExp(`# ${name} \\([0-9-]+, [0-9-]+\\)`)
}

export function tableNameToLine(name: string, position: Position) {
  let x = position.x.toFixed(0)
  let y = position.y.toFixed(0)
  return `# ${name} (${x}, ${y})`
}
