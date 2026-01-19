import { formatEnum } from './enum'
import {
  Position,
  textBgColorRegex,
  tableNameRegex,
  tableNameRegex_g,
  textColorRegex,
  viewPositionRegex,
  zoomValueRegex,
  diagramBgColorRegex,
  tableBgColorRegex,
  tableTextColorRegex,
  diagramTextColorRegex,
} from './meta'

export function parse(input: string): ParseResult {
  const parser = new Parser()
  parser.parse(input)
  return parser
}

export type ParseResult = {
  table_list: Table[]
  zoom?: number
  view?: Position
  textBgColor?: string
  textColor?: string
  diagramBgColor?: string
  diagramTextColor?: string
  tableBgColor?: string
  tableTextColor?: string
}

export class Parser implements ParseResult {
  table_list: Table[] = []
  line_list: string[] = []
  zoom?: number
  view?: Position
  textBgColor?: string
  diagramTextColor?: string
  textColor?: string
  diagramBgColor?: string
  tableBgColor?: string
  tableTextColor?: string
  parse(input: string) {
    input.split('\n').forEach(line => {
      line = line
        .trim()
        .replace(/#.*/, '')
        .replace(/\/\/.*/, '')
        .trim()
      // if line is only dashes, keep it as delimiter after table name, otherwise strip it as comment
      if (!line.match(/^-+$/)) {
        line = line.replace(/--.*/, '').trim()
      }
      if (!line) return
      this.line_list.push(line)
    })
    this.table_list = []
    while (this.hasTable()) {
      this.table_list.push(this.parseTable())
    }
    this.parseMeta(input)
  }
  parseMeta(input: string) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
    const zoom = +input.match(zoomValueRegex)?.[1]!
    if (zoom) this.zoom = zoom

    const view = input.match(viewPositionRegex)
    if (view) this.view = { x: +view[1], y: +view[2] }

    const textBgColor = input.match(textBgColorRegex)
    if (textBgColor) this.textBgColor = textBgColor[1]

    const textColor = input.match(textColorRegex)
    if (textColor) this.textColor = textColor[1]

    const diagramBgColor = input.match(diagramBgColorRegex)
    if (diagramBgColor) this.diagramBgColor = diagramBgColor[1]

    const diagramTextColor = input.match(diagramTextColorRegex)
    if (diagramTextColor) this.diagramTextColor = diagramTextColor[1]

    const tableBgColor = input.match(tableBgColorRegex)
    if (tableBgColor) this.tableBgColor = tableBgColor[1]

    const tableTextColor = input.match(tableTextColorRegex)
    if (tableTextColor) this.tableTextColor = tableTextColor[1]

    input.match(tableNameRegex_g)?.forEach(line => {
      const match = line.match(tableNameRegex) || []
      const name = match[1]
      const x = +match[2]
      const y = +match[3]
      const color = match[4]
      const table = this.table_list.find(table => table.name == name)
      if (table) table.position = { x, y, color }
    })
  }
  peekLine(): string {
    if (this.line_list.length === 0) {
      throw new Error('no reminding line')
    }
    return this.line_list[0]
  }
  hasTable() {
    while (this.line_list[0] === '') this.line_list.shift()
    return this.line_list[0] && this.line_list[1]?.startsWith('-')
  }
  parseTable(): Table {
    const name = this.parseName()
    this.parseEmptyLine()
    this.skipLine('-')
    const field_list = parseAll(() => {
      // skip empty lines
      if (this.hasTable()) {
        throw new Error('end of table')
      }
      return this.parseField()
    })
    const has_primary_key = field_list.some(field => field.is_primary_key)
    if (!has_primary_key) {
      const field = field_list.find(field => field.name === 'id')
      if (field) {
        field.is_primary_key = true
      }
    }
    return { name, field_list }
  }
  parseField(): Field {
    const field_name = this.parseName()
    let type = ''
    let is_null = false
    let is_unique = false
    let is_primary_key = false
    let is_unsigned = false
    let default_value: string | undefined
    let references: ForeignKeyReference | undefined
    for (;;) {
      const name = this.parseType()
      if (!name) break
      switch (name.toUpperCase()) {
        case 'NULL':
          is_null = true
          continue
        case 'UNIQUE':
          is_unique = true
          continue
        case 'UNSIGNED':
          is_unsigned = true
          continue
        case 'DEFAULT':
          // TODO parse default value
          default_value = this.parseDefaultValue()
          continue
        case 'PK':
          is_primary_key = true
          continue
        case 'FK':
          references = this.parseForeignKeyReference(field_name)
          continue
        default:
          if (type) {
            console.debug('unexpected token:', {
              field_name,
              type,
              token: name,
            })
            continue
          }
          type = name
      }
    }
    type ||= defaultFieldType
    this.skipLine()
    return {
      name: field_name,
      type,
      is_null,
      is_unique,
      is_primary_key,
      is_unsigned,
      default_value,
      references,
    }
  }
  skipLine(line = '') {
    if (this.line_list[0]?.startsWith(line)) {
      this.line_list.shift()
    }
  }
  parseEmptyLine() {
    const line = this.line_list[0]?.trim()
    if (line !== '') {
      throw new NonEmptyLineError(line)
    }
    this.line_list.shift()
  }
  parseName(): string {
    let line = this.peekLine()
    const match = line.match(/[a-zA-Z0-9_]+/)
    if (!match) {
      throw new ParseNameError(line)
    }
    const name = match[0]
    line = line.replace(name, '').trim()
    this.line_list[0] = line
    return name
  }
  parseType(): string | undefined {
    let line = this.peekLine()
    let match = line.match(/^not null\s*/i)
    if (match) {
      line = line.slice(match[0].length)
    }
    match = line.match(/^\w+\(.*?\)/) || line.match(/^[a-zA-Z0-9_(),"']+/)
    if (!match) {
      return
    }
    const name = match[0]
    line = line.replace(name, '').trim()
    this.line_list[0] = line
    if (name.match(/^enum/i)) {
      return formatEnum(name)
    }
    return name
  }
  parseDefaultValue(): string {
    let line = this.peekLine()
    let end: number
    if (line[0] === '"') {
      end = line.indexOf('"', 1) + 1
    } else if (line[0] === "'") {
      end = line.indexOf("'", 1) + 1
    } else if (line[0] === '`') {
      end = line.indexOf('`', 1) + 1
    } else if (line.includes(' ')) {
      end = line.indexOf(' ')
    } else {
      end = line.length - 1
    }
    const value = line.slice(0, end + 1)
    line = line.replace(value, '').trim()
    this.line_list[0] = line
    return value
  }
  parseRelationType(): RelationType {
    let line = this.peekLine()
    const match = line.match(/.* /)
    if (!match) {
      throw new ParseRelationTypeError(line)
    }
    const type = match[0].trim() as RelationType
    line = line.replace(match[0], '').trim()
    this.line_list[0] = line
    return type
  }
  parseForeignKeyReference(ref_field_name: string): ForeignKeyReference {
    if (ref_field_name.endsWith('_id') && this.peekLine() === '') {
      return {
        table: ref_field_name.replace(/_id$/, ''),
        field: 'id',
        type: defaultRelationType,
      }
    }
    const type = this.parseRelationType()
    const table = this.parseName()
    const line = this.peekLine()
    let field: string
    if (line == '') {
      field = 'id'
    } else if (line.startsWith('.')) {
      this.line_list[0] = line.slice(1)
      field = this.parseName()
    } else {
      throw new ParseForeignKeyReferenceError(line)
    }
    return { type, table, field }
  }
}
class NonEmptyLineError extends Error {}
class LineError extends Error {
  constructor(
    public line: string,
    message?: string,
  ) {
    super(message)
  }
}
class ParseNameError extends LineError {}
class ParseRelationTypeError extends LineError {}
class ParseForeignKeyReferenceError extends LineError {
  constructor(public line: string) {
    super(line, `expect '.', got '${line[0]}'`)
  }
}

function parseAll<T>(fn: () => T): T[] {
  const result_list: T[] = []
  for (;;) {
    try {
      result_list.push(fn())
    } catch (error) {
      return result_list
    }
  }
}

export type Table = {
  is_virtual?: boolean
  name: string
  field_list: Field[]
  position?: { x: number; y: number; color?: string }
}

export type Field = {
  name: string
  type: string
  is_primary_key: boolean
  is_unique: boolean
  is_null: boolean
  is_unsigned: boolean
  references: ForeignKeyReference | undefined
  default_value: string | undefined
}
export type ForeignKeyReference = {
  type: RelationType
  table: string
  field: string
}

export type Relation = {
  from: { table: string; field: string }
  to: { table: string; field: string }
  /*
  -     - one TO one
  -<    - one TO many
  >-    - many TO one
  >-<   - many TO many
  -0    - one TO zero or one
  0-    - zero or one TO one
  0-0   - zero or one TO zero or one
  -0<   - one TO zero or many
  >0-   - zero or many TO one
*/
  type: RelationType
}

export type RelationType =
  | '|'
  | '-<'
  | '>-'
  | '>-<'
  | '-0'
  | '0-'
  | '0-0'
  | '-0<'
  | '>0-'

const defaultFieldType = 'integer'

const defaultRelationType: RelationType = '>0-'
