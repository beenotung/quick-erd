export function toTsType(type: string): string {
  if (
    type.match(/^varchar/i) ||
    type.match(/^string/i) ||
    type.match(/^text/i)
  ) {
    return 'string'
  }
  if (
    type.match(/^decimal/i) ||
    type.match(/^numeric/i) ||
    type.match(/^int/i) ||
    type.match(/^float/i) ||
    type.match(/^double/i) ||
    type.match(/^real/i)
  ) {
    return 'number'
  }
  if (type.match(/^bool/i)) {
    return 'boolean'
  }
  if (type.match(/^enum/i)) {
    return type.replace(/^enum/i, '').split(',').join(' | ')
  }
  if (type.match(/^date/i) || type.match(/^time/i)) {
    return 'string'
  }
  if (type.match(/^blob/i)) {
    return 'Buffer'
  }
  return 'string // ' + type
}
