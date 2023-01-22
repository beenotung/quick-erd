export function decodeColor(color: string): string {
  let match = color.match(/^#\w+$/)
  if (match) return color

  console.log(color)
  match = color.match(/^rgb\((\w+)\s*,\s*(\w+)\s*,\s*(\w+)\)$/)
  if (match) {
    return '#' + toHex(match[1]) + toHex(match[2]) + toHex(match[3])
  }

  let span = document.createElement('span')
  span.style.color = 'cornflowerblue'
  span.style.display = 'none'
  document.body.appendChild(span)
  let s = getComputedStyle(span).color
  span.remove()
  return decodeColor(s)
}

function toHex(int: string): string {
  let hex = (+int).toString(16)
  if (hex.length == 1) {
    return '0' + hex
  }
  return hex
}
