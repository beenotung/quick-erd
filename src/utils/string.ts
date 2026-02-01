/** Find the first occurrence of any pattern, returns -1 if none found */
export function firstIndexOf(
  string: string,
  patterns: string[],
  offset = 0,
): number {
  const index_list = patterns
    .map(pattern => string.indexOf(pattern, offset))
    .filter(index => index !== -1)
    .sort((a, b) => a - b)
  return index_list.length === 0 ? -1 : index_list[0]
}
