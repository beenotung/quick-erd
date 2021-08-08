export function parse(input: string): ParseResult {
  const parser = new Parser()
  parser.parse(input)
  return parser
}

export type ParseResult = {
  table_list: Table[]
  relation_list: Relation[]
}

class Parser implements ParseResult {
  table_list: Table[] = []
  relation_list: Relation[] = []
  line_list: string[] = []
  parse(input: string) {
    this.line_list = input.split('\n').map(line => line.trim())
    this.table_list = parseAll(() => this.parseTable())
    return {
      table_list: this.table_list,
      relation_list: this.relation_list,
    }
  }
  peekLine(): string {
    if (this.line_list.length === 0) {
      throw new Error('no reminding line')
    }
    return this.line_list[0]
  }
  parseTable(): Table {
    const name = this.parseName()
    this.skipLine()
    this.skipLine('-')
    const field_list = parseAll(() => this.parseField())
    this.skipLine()
    return { name, field_list }
  }
  parseField(): Field {
    const name = this.parseName()
    const type = this.parseOptionalName() || defaultFieldType
    this.skipLine()
    return { name, type }
  }
  skipLine(line = '') {
    if (this.line_list[0]?.startsWith(line)) {
      this.line_list.shift()
    }
  }
  parseOptionalName(): string | undefined {
    try {
      return this.parseName()
    } catch (error) {
      return
    }
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
}

class ParseNameError extends Error {
  constructor(public line: string) {
    super()
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
