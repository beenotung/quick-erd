export function snake_to_Pascal(name: string): string {
  return name
    .split('_')
    .map(s => s.slice(0, 1).toUpperCase() + s.slice(1))
    .join('')
}

export function snake_to_camel(name: string): string {
  name = snake_to_Pascal(name)
  return name.slice(0, 1).toLowerCase() + name.slice(1)
}
