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

export function writeSrcFileIfNeeded(file: string, code: string) {
  try {
    let oldCode = readFileSync(file).toString()
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
  const deps = (pkg[field] = pkg[field] || {})
  if (name in deps) {
    return
  }
  deps[name] = version
  const text = JSON.stringify(pkg, null, 2)
  writeSrcFile(file, text)
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
