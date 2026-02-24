export function isRootDir(dir: string): boolean {
  // for unix like system
  if (dir === '/') return true

  // for windows like system, e.g. C:\ or C:
  if ((dir.length == 2 || dir.length == 3) && dir[1] == ':') return true

  return false
}
