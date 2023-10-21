import { Table } from './../core/ast'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { Field, parse } from '../core/ast'
import { sortTables } from './sort-tables'
import { snake_to_camel, snake_to_Pascal } from '../utils/case'
import { writeSrcFile, writeSrcFileIfNeeded } from '../utils/file'
import { DBClient } from '../utils/cli'
import { parseEnumValues } from '../core/enum'

export function textToSpring(dbClient: DBClient, text: string) {
  const result = parse(text)
  const table_list = sortTables(result.table_list)

  const package_name_list = ['entity', 'repository', 'projection']
  const app = setupDirectories(package_name_list)

  for (const table of table_list) {
    setupEntity(dbClient, app, table)
    setupRepository(app, table)
  }
}

export function setupDirectories(
  package_name_list: string[],
): SpringBootApplication {
  const srcDir = findSrcDir()
  const app = findSpringBootApplication(srcDir)
  if (!app) {
    console.error('Error: failed to locate spring boot application package')
    process.exit(1)
  }
  for (const name of package_name_list) {
    initPackage(app, name)
  }
  return app
}

export function initPackage(app: SpringBootApplication, name: string) {
  const dir = join(app.dir, name)
  mkdirSync(dir, { recursive: true })
}

export function findSrcDir() {
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

export type SpringBootApplication = {
  dir: string
  package: string
}

export function findSpringBootApplication(
  dir: string,
): SpringBootApplication | undefined {
  for (const filename of readdirSync(dir)) {
    const file = join(dir, filename)
    const stat = statSync(file)
    if (stat.isFile() && filename.endsWith('Application.java')) {
      const packageName = findSpringBootApplicationPackage(file)
      if (packageName) {
        return { dir, package: packageName }
      }
    }
    if (stat.isDirectory()) {
      const res = findSpringBootApplication(file)
      if (res) return res
    }
  }
}

function findSpringBootApplicationPackage(file: string) {
  const code = readFileSync(file).toString()

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
  table: Table,
) {
  const dir = join(app.dir, 'entity')
  const ClassName = snake_to_Pascal(table.name) + 'Entity'
  const file = join(dir, `${ClassName}.java`)

  const imports = new Set<string>()
  let fieldLines = ''
  let methodLines = ''

  for (const field of table.field_list) {
    if (field.name === 'id') {
      continue
    }
    const is_enum = field.type.match(/^enum/i)
    if (is_enum) {
      setupEnum(app, table, field)
      imports.add('import jakarta.persistence.EnumType;')
    }
    const type = toJavaType(table, field)
    if (type.import) {
      imports.add(type.import)
    }
    const fieldName = snake_to_camel(field.name)
    const FieldName = snake_to_Pascal(field.name)
    let annotation = `@Column(name = "\`${field.name}\`", nullable = ${field.is_null})`
    if (is_enum) {
      annotation += '\n    @Enumerated(EnumType.STRING)'
    }
    fieldLines += `

    ${annotation}
    private ${type.Class} ${fieldName};`
    methodLines += `

    public ${type.Class} get${FieldName}() {
        return ${fieldName};
    }

    public void set${FieldName}(${type.Class} ${fieldName}) {
        this.${fieldName} = ${fieldName};
    }`
  }

  let importLines = Array.from(imports).join('\n')

  importLines = `
import jakarta.persistence.*;
${importLines}
`.trim()

  const idAnnotation =
    dbClient == 'postgresql'
      ? '@GeneratedValue(strategy = GenerationType.IDENTITY)'
      : '@GeneratedValue'

  const code =
    `
package ${app.package}.entity;

${importLines}

@Entity
@Table(name = "\`${table.name}\`")
public class ${ClassName} {
    @Id
    ${idAnnotation}
    @Column(name = "\`id\`")
    private Long id;

    ${fieldLines.trim()}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    ${methodLines.trim()}
`.trim() +
    `
}`
  writeSrcFileIfNeeded(file, code)
}

function setupEnum(app: SpringBootApplication, table: Table, field: Field) {
  const dir = join(app.dir, 'entity')
  const ClassName = snake_to_Pascal(table.name) + snake_to_Pascal(field.name)
  const file = join(dir, `${ClassName}.java`)

  const values = parseEnumValues(field.type)

  let code = `
package ${app.package}.entity;

public enum ${ClassName} {`

  code += values.map(value => '\n    ' + value + ',').join('')

  code += '\n}'

  writeSrcFileIfNeeded(file, code)
}

function setupRepository(app: SpringBootApplication, table: Table) {
  const dir = join(app.dir, 'repository')
  const ClassName = snake_to_Pascal(table.name)
  const file = join(dir, `${ClassName}Repository.java`)

  if (existsSync(file)) return

  const code = `
package ${app.package}.repository;

import ${app.package}.entity.${ClassName}Entity;
import org.springframework.data.repository.CrudRepository;

public interface ${ClassName}Repository extends CrudRepository<${ClassName}Entity, Long> {
}
`
  writeSrcFile(file, code)
}

export function toJavaType(
  table: Table,
  field: Field,
): { Class: string; import?: string } {
  const type = field.type

  if (
    type.match(/^varchar/i) ||
    type.match(/^char/i) ||
    type.match(/^string/i) ||
    type.match(/^text/i)
  ) {
    return { Class: 'String' }
  }

  if (type.match(/^integer/i)) {
    return { Class: 'Long' }
  }

  if (type.match(/^int/i)) {
    return { Class: 'Integer' }
  }

  if (type.match(/^real/i)) {
    return { Class: 'Double' }
  }

  if (type.match(/^float/i)) {
    return { Class: 'Float' }
  }

  if (type.match(/^timestamp/i)) {
    return {
      Class: 'Timestamp',
      import: 'import java.sql.Timestamp;',
    }
  }

  if (type.match(/^date/i)) {
    return {
      Class: 'Date',
      import: 'import java.sql.Date;',
    }
  }

  if (type.match(/^time/i)) {
    return {
      Class: 'Time',
      import: 'import java.sql.Time;',
    }
  }

  if (type.match(/^enum/i)) {
    return {
      Class: snake_to_Pascal(table.name) + snake_to_Pascal(field.name),
      import: 'import jakarta.persistence.Enumerated;',
    }
  }

  if (type.match(/^boolean/i)) {
    return { Class: 'Boolean' }
  }

  console.error('Unknown Java class for field.type:', field.type)
  return {
    Class: snake_to_Pascal(field.type),
  }
}
