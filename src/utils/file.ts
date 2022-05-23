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
  console.error('saving to', file, '...')
  code = code.trim() + '\n'
  writeFileSync(file, code)
}

export function addDependencies(
  name: string,
  version: string,
  mode?: 'prod' | 'dev',
) {
  const file = 'package.json'
  const pkg = JSON.parse(readFileSync(file).toString())

  const field = mode === 'dev' ? 'devDependencies' : 'dependencies'
  pkg[field] = pkg[field] || {}
  if (name in pkg[field]) {
    return
  }
  pkg[field][name] = version
  const text = JSON.stringify(pkg, null, 2)
  writeSrcFile(file, text)
}
