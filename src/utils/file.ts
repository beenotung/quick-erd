import { readFileSync, writeFileSync } from 'fs'

export function readErdFromStdin(cb: (text: string) => void) {
  if (process.stdin.isTTY) {
    console.error('Reading erd from stdin... (Please pipe erd text to stdin)')
  }
  let text = ''
  process.stdin
    .on('data', chunk => (text += chunk))
    .on('end', () => {
      if (!text) {
        console.error('missing erd text from stdin')
        process.exit(1)
      }
      cb(text)
    })
}

export function writeSrcFile(file: string, code: string) {
  code = code.trim() + '\n'
  writeFileSync(file, code)
}

export function addDependencies(name: string, version: string) {
  const file = 'package.json'
  const pkg = JSON.parse(readFileSync(file).toString())
  pkg.dependencies = pkg.dependencies || {}
  if (name in pkg.dependencies) {
    return
  }
  pkg.dependencies[name] = version
  const text = JSON.stringify(pkg, null, 2)
  writeSrcFile(file, text)
}
