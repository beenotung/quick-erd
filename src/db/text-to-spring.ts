import { Table } from './../core/ast'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { Field, parse } from '../core/ast'
import { sortTables } from './sort-tables'
import { snake_to_camel, snake_to_Pascal } from '../utils/case'
import { writeSrcFile } from '../utils/file'
import { DBClient } from '../utils/cli'

export function textToSpring(dbClient: DBClient, text: string) {
  const result = parse(text)
  const table_list = sortTables(result.table_list).map(mapJavaTable)

  let app = setupDirectories()

  for (let table of table_list) {
    setupEntity(dbClient, app, table)
  }
}

type JavaTable = {
  table: Table
  name: {
    snake_case: string
    PascalCase: string
    camelCase: string
  }
}

function mapJavaTable(table: Table): JavaTable {
  let snake_case = table.name
  let PascalCase = snake_to_Pascal(snake_case)
  let camelCase = snake_to_camel(snake_case)
  return {
    table,
    name: {
      snake_case,
      PascalCase,
      camelCase,
    },
  }
}

function setupDirectories(): SpringBootApplication {
  let srcDir = findSrcDir()
  let app = findSpringBootApplication(srcDir)
  if (!app) {
    console.error('Error: failed to locate spring boot application package')
    process.exit(1)
  }
  initPackage(app, 'model')
  initPackage(app, 'controller')
  initPackage(app, 'service')
  initPackage(app, 'repository')
  initPackage(app, 'entity')
  initPackage(app, 'projection')
  initPackage(app, 'dto')
  initPackage(app, 'mapper')
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

function setupEntity(
  dbClient: DBClient,
  app: SpringBootApplication,
  table: JavaTable,
) {
  let dir = join(app.dir, 'entity')
  let ClassName = table.name.PascalCase + 'Entity'
  let file = join(dir, `${ClassName}.java`)

  let idField: Field | undefined

  let body = ''

  for (let field of table.table.field_list) {
    if (field.name === 'id') {
      idField = field
      continue
    }
    let type = 'String'
    let fieldName = snake_to_camel(field.name)
    body += `

  @Column(name = "\`${field.name}\`", nullable = false)
  private ${type} ${fieldName};`
  }

  let idAnnotation =
    (idField && idField.type !== 'integer') || dbClient == 'postgresql'
      ? `@GeneratedValue(strategy = GenerationType.IDENTITY)`
      : `@GeneratedValue(strategy = GenerationType.AUTO)`

  let code =
    `
package ${app.package}.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "\`${table.table.name}\`")
public class ${ClassName} {
  @Id
  ${idAnnotation}
  @Column
  private Long id;

  ${body.trim()}
`.trim() +
    `
}`
  writeSrcFile(file, code)
}
