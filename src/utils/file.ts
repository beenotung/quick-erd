import { readFileSync, writeFileSync, existsSync } from 'fs'
import { extname } from 'path'

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

const writtenFiles = new Set<string>()

export function writeSrcFile(file: string, code: string) {
  if (!writtenFiles.has(file)) {
    console.error('saving to', file)
    writtenFiles.add(file)
  }
  code = code.trim() + '\n'
  writeFileSync(file, code)
}

export function writeSrcFileIfNeeded(file: string, code: string) {
  try {
    const oldCode = readFileSync(file).toString()
    if (oldCode.trim() == code.trim()) return
  } catch (error) {
    // this is new file
  }
  writeSrcFile(file, code)
}

export function addDependencies(
  name: string,
  version: string,
  mode?: 'prod' | 'dev',
) {
  const file = 'package.json'
  const pkg: PackageJSON = readPackageJSON(file)

  const field = mode === 'dev' ? 'devDependencies' : 'dependencies'
  const deps = pkg[field] || {}
  if (name in deps) {
    return
  }
  deps[name] = version
  pkg[field] = Object.fromEntries(
    Object.keys(deps)
      .sort()
      .map(name => [name, deps[name]]),
  )
  const text = JSON.stringify(pkg, null, 2)
  writeSrcFile(file, text)
}

export function addGitIgnore(file: string, patterns: string[]) {
  let text = (existsSync(file) && readFileSync(file).toString()) || ''
  const originalText = text
  if (text && !text.endsWith('\n')) {
    text += '\n'
  }
  const lines = text.split('\n').map(line => line.trim())
  for (const pattern of patterns) {
    const hasPattern = lines.some(
      line =>
        line == pattern ||
        line == pattern + '/' ||
        line + '/' == pattern ||
        line == pattern + '*' ||
        line == '*' + pattern + '*' ||
        line == '*' + extname(pattern) ||
        line == '*' + extname(pattern) + '*',
    )
    if (!hasPattern) {
      text += pattern + '\n'
    }
  }
  if (text != originalText) {
    writeSrcFile(file, text)
  }
}

export function readNpmScripts(): Record<string, string> {
  const file = 'package.json'
  const pkg: PackageJSON = readPackageJSON(file)
  return pkg.scripts || {}
}

export function addNpmScripts(scripts: Record<string, string>) {
  const file = 'package.json'
  const pkg: PackageJSON = readPackageJSON(file)
  const originalText = JSON.stringify(pkg, null, 2)
  pkg.scripts ||= {}
  for (const key in scripts) {
    if (!(key in pkg.scripts)) {
      pkg.scripts[key] = scripts[key]
    }
  }
  const newText = JSON.stringify(pkg, null, 2)
  if (newText != originalText) {
    writeSrcFile(file, newText)
  }
}

export function readPackageJSON(file: string) {
  const pkg: PackageJSON = JSON.parse(readFileSync(file).toString())
  return pkg
}

export type PackageJSON = {
  type?: 'commonjs' | 'module'
  devDependencies?: Record<string, string>
  dependencies?: Record<string, string>
  scripts?: Record<string, string>
}
