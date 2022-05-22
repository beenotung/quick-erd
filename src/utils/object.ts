export function isObjectSample<T>(a: T, b: T): boolean {
  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).sort()
  if (aKeys.join(',') !== bKeys.join(',')) {
    return false
  }
  for (const key of aKeys) {
    const aValue = (a as any)[key]
    const bValue = (b as any)[key]
    const isSame =
      aValue && typeof aValue === 'object'
        ? isObjectSample(aValue, bValue)
        : aValue === bValue
    if (!isSame) {
      return false
    }
  }
  return true
}
