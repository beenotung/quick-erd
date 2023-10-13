import { TablePositionColor } from './../core/meta'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { Field, parse } from '../core/ast'
import { sortTables } from './sort-tables'

export function textToSpring(text: string) {
  const result = parse(text)
  const table_list = sortTables(result.table_list)

  setupDirectories()
}

function setupDirectories() {
  let srcDir = findSrcDir()
  let app = findSpringBootApplication(srcDir)
  if (!app) {
    console.error('Error: failed to locate spring boot application package')
    process.exit(1)
  }
  console.log('app:', app)
  initPackage(app, 'model')
  initPackage(app, 'controller')
  initPackage(app, 'service')
  initPackage(app, 'repository')
  initPackage(app, 'dto')
  return app
}

function initPackage(app: SpringBootApplication, name: string) {
  let dir = join(app.dir, name)
  mkdirSync(dir, { recursive: true })
}

function findSrcDir() {
  let rootDir = '.'
  let srcDir: string
  for (;;) {
    srcDir = join(rootDir, 'src')
    if (existsSync(srcDir)) break
    if (resolve(srcDir) == '/') {
      console.error('Error: failed to locate the src directory of java project')
      process.exit(1)
    }
    rootDir = join('..', rootDir)
  }
  return srcDir
}

type SpringBootApplication = {
  dir: string
  package: string
}
function findSpringBootApplication(
  dir: string,
): SpringBootApplication | undefined {
  for (let filename of readdirSync(dir)) {
    let file = join(dir, filename)
    let stat = statSync(file)
    if (stat.isFile() && filename.endsWith('Application.java')) {
      let packageName = findSpringBootApplicationPackage(file)
      if (packageName) {
        return { dir, package: packageName }
      }
    }
    if (stat.isDirectory()) {
      let res = findSpringBootApplication(file)
      if (res) return res
    }
  }
}

function findSpringBootApplicationPackage(file: string) {
  let code = readFileSync(file).toString()

  let packageName: string | undefined
  let isSpringApplication = false

  for (let line of code.split('\n')) {
    line = line.trim()
    isSpringApplication ||= line.startsWith('@SpringBootApplication')
    packageName ||= line.match(/^package ([\w\.]+);/)?.[1]
    if (isSpringApplication && packageName) return packageName
  }
}
