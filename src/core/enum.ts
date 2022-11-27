export function formatEnum(type: string): string {
  return type
    .replace(/\(/g, "('")
    .replace(/\)/g, "')")
    .replace(/ ?, ?/g, "','")
    .replace(/''/g, "'")
}
