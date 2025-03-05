import { Enum, Table } from '../core/ast'

export function parsePrismaSchema(input: string): PrismaSchema {
  const parser = new PrismaSchemaParser()
  parser.parse(input)
  return parser
}

export type PrismaSchema = {
  datasource?: {
    provider: string
    url: string
  }
  generator?: {
    provider: string
  }
  table_list: Table[]
  enum_list: Enum[]
}

export class PrismaSchemaParser implements PrismaSchema {
  table_list: Table[] = []
  enum_list: Enum[] = []

  parse(input: string) {
    // TODO implement prisma schema parser
  }
}

export function prismaSchemaToText(schema: PrismaSchema): string {
  // TODO implement prisma schema generator
  return ''
}
