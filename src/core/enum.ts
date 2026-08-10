export function formatEnum(type: string): string {
  return type
    .replace(/\(/g, "('")
    .replace(/\)/g, "')")
    .replace(/ ?, ?/g, "','")
    .replace(/''/g, "'")
}

export function parseEnumValues(type: string): string[] {
  return (type.match(/\((.*)\)/)?.[1] || '')
    .split(',')
    .map(value => value.replace(/'/g, '').trim())
}
