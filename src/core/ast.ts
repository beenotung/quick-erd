export function parse(input: string): ParseResult {
  const parser = new Parser()
  parser.parse(input)
  return parser
}

export type ParseResult = {
  table_list: Table[]
}

class Parser implements ParseResult {
  table_list: Table[] = []
  line_list: string[] = []
  parse(input: string) {
    input.split('\n').forEach(line => {
      line = line
        .trim()
        .replace(/#.*/, '')
        .replace(/\/\/.*/, '')
        .trim()
      if (!line) return
      this.line_list.push(line)
    })
    this.table_list = []
    while (this.hasTable()) {
      this.table_list.push(this.parseTable())
    }
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
    return { name, field_list }
  }
  parseField(): Field {
    const name = this.parseName()
    let type = defaultFieldType
    let is_null = false
    let is_primary_key = false
    let references: ForeignKeyReference | undefined
    for (;;) {
      const name = this.parseType()
      if (!name) break
      switch (name.toUpperCase()) {
        case 'NULL':
          is_null = true
          continue
        case 'PK':
          is_primary_key = true
          continue
        case 'FK':
          references = this.parseForeignKeyReference()
          continue
        default:
          type = name
      }
    }
    this.skipLine()
    return {
      name,
      type,
      is_null,
      is_primary_key,
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
    const match = line.match(/[a-zA-Z0-9_(),"']+/)
    if (!match) {
      return
    }
    const name = match[0]
    line = line.replace(name, '').trim()
    this.line_list[0] = line
    return name
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
  parseForeignKeyReference(): ForeignKeyReference {
    const type = this.parseRelationType()
    const table = this.parseName()
    let line = this.peekLine()
    if (!line.startsWith('.')) {
      throw new ParseForeignKeyReferenceError(line)
    }
    line = line.substr(1)
    this.line_list[0] = line
    const field = this.parseName()
    return { type, table, field }
  }
}
class NonEmptyLineError extends Error {}
class LineError extends Error {
  constructor(public line: string, message?: string) {
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
  name: string
  field_list: Field[]
}

export type Field = {
  name: string
  type: string
  is_primary_key: boolean
  is_null: boolean
  references: ForeignKeyReference | undefined
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
