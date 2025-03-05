import { expect } from 'chai'
import {
  parsePrismaSchema as parse,
  PrismaSchema,
  prismaSchemaToText,
} from './ast'
import { Enum, Table } from '../core/ast'

describe('prisma schema AST TestSuit', () => {
  const schema_text = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique
  name    String?
  role    Role     @default(USER)
  posts   Post[]
  profile Profile?
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String
  user   User   @relation(fields: [userId], references: [id])
  userId Int    @unique
}

model Post {
  id         Int        @id @default(autoincrement())
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  title      String
  published  Boolean    @default(false)
  author     User       @relation(fields: [authorId], references: [id])
  authorId   Int
  categories Category[]
}

model Category {
  id    Int    @id @default(autoincrement())
  name  String
  posts Post[]
}

enum Role {
  USER
  ADMIN
}
`
  const user_table: Table = {
    name: 'User',
    field_list: [
      {
        name: 'id',
        type: 'Int',
        is_null: false,
        is_unique: false,
        is_primary_key: true,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'email',
        type: 'String',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'name',
        type: 'String',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'role',
        type: 'Role',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
    ],
  }
  const profile_table: Table = {
    name: 'Profile',
    field_list: [
      {
        name: 'id',
        type: 'Int',
        is_null: false,
        is_unique: false,
        is_primary_key: true,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'bio',
        type: 'String',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'userId',
        type: 'Int',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: {
          type: '>0-',
          table: 'User',
          field: 'id',
        },
      },
    ],
  }
  const post_table: Table = {
    name: 'Post',
    field_list: [
      {
        name: 'id',
        type: 'Int',
        is_null: false,
        is_unique: false,
        is_primary_key: true,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'createdAt',
        type: 'DateTime',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'updatedAt',
        type: 'DateTime',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'title',
        type: 'String',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'published',
        type: 'Boolean',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'authorId',
        type: 'Int',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: {
          type: '>-',
          table: 'User',
          field: 'id',
        },
      },
    ],
  }
  const category_table: Table = {
    name: 'Category',
    field_list: [
      {
        name: 'id',
        type: 'Int',
        is_null: false,
        is_unique: false,
        is_primary_key: true,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
      {
        name: 'name',
        type: 'String',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: undefined,
      },
    ],
  }
  const category_to_post_table: Table = {
    name: '_CategoryToPost',
    field_list: [
      {
        name: 'categoryId',
        type: 'Int',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: {
          type: '>-',
          table: 'Category',
          field: 'id',
        },
      },
      {
        name: 'postId',
        type: 'Int',
        is_null: false,
        is_unique: false,
        is_primary_key: false,
        is_unsigned: false,
        default_value: undefined,
        references: {
          type: '>-',
          table: 'Post',
          field: 'id',
        },
      },
    ],
  }
  const role_enum: Enum = {
    name: 'Role',
    value_list: ['USER', 'ADMIN'],
  }
  const schema_ast: PrismaSchema = {
    datasource: {
      provider: 'postgresql',
      url: 'env("DATABASE_URL")',
    },
    generator: {
      provider: 'prisma-client-js',
    },
    table_list: [
      user_table,
      profile_table,
      post_table,
      category_table,
      category_to_post_table,
    ],
    enum_list: [role_enum],
  }

  describe('prisma schema parser', () => {
    it('should parse datasource', () => {
      const text = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`
      const schema = parse(text)
      expect(schema.datasource).to.deep.equals({
        provider: 'postgresql',
        url: 'env("DATABASE_URL")',
      })
    })

    it('should parse generator', () => {
      const text = `
generator client {
  provider = "prisma-client-js"
}
`
      const schema = parse(text)
      expect(schema.generator).to.deep.equals({
        provider: 'prisma-client-js',
      })
    })

    it('should parse model', () => {
      const text = `
model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique
  name    String?
  role    Role     @default(USER)
}
`
      const schema = parse(text)
      expect(schema.table_list).to.have.lengthOf(1)

      const table = schema.table_list[0]
      expect(table.name).to.equals('User')
      expect(table.field_list).to.have.lengthOf(4)

      expect(table.field_list[0]).to.equals('id')
      expect(table.field_list[0].type).to.equals('Int')
      expect(table.field_list[0].is_primary_key).to.equals(true)
      expect(table.field_list[0].is_null).to.equals(false)

      expect(table.field_list[1]).to.equals('email')
      expect(table.field_list[1].type).to.equals('String')
      expect(table.field_list[1].is_unique).to.equals(true)
      expect(table.field_list[1].is_null).to.equals(false)

      expect(table.field_list[2]).to.equals('name')
      expect(table.field_list[2].type).to.equals('String')
      expect(table.field_list[2].is_null).to.equals(true)

      expect(table.field_list[3]).to.equals('role')
      expect(table.field_list[3].type).to.equals('Role')
      expect(table.field_list[3].is_null).to.equals(false)
      expect(table.field_list[3].default_value).to.equals('USER')

      expect(table).deep.equals(user_table)
    })

    it('should parse models with relation', () => {
      const text = `
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  role  Role    @default(USER)
  posts Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  title     String
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}
`
      const schema = parse(text)
      expect(schema.table_list).to.have.lengthOf(2)

      const user_table = schema.table_list[0]
      expect(user_table.name).to.equals('User')
      expect(user_table.field_list).to.have.lengthOf(4)

      const post_table = schema.table_list[1]
      expect(post_table.name).to.equals('Post')
      expect(post_table.field_list).to.have.lengthOf(3)

      const author_field = post_table.field_list[2]
      expect(author_field.name).to.equals('author')
      expect(author_field.type).to.equals('Int')
      expect(author_field.references).to.deep.equals({
        table: 'User',
        field: 'id',
        type: '>0-',
      })
    })

    it('should parse enum', () => {
      const text = `
enum Role {
  USER
  ADMIN
}
`
      const schema = parse(text)
      expect(schema.enum_list).to.have.lengthOf(1)
      const role = schema.enum_list[0]
      expect(role.name).to.equals('Role')
      expect(role.value_list).to.deep.equals(['USER', 'ADMIN'])
    })

    it('should parse mixed schema', () => {
      const schema = parse(schema_text)
      expect(schema).deep.equals(schema_ast)
    })
  })

  describe('prisma schema generator', () => {
    it('should generate datasource', () => {
      const text = prismaSchemaToText({
        datasource: schema_ast.datasource,
        table_list: [],
        enum_list: [],
      })
      expect(text).to.equals(`
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`)
    })

    it('should generate generator', () => {
      const text = prismaSchemaToText({
        generator: schema_ast.generator,
        table_list: [],
        enum_list: [],
      })
      expect(text).to.equals(`
generator client {
  provider = "prisma-client-js"
}
`)
    })

    it('should generate model', () => {
      const text = prismaSchemaToText({
        table_list: [user_table],
        enum_list: [],
      })
      expect(text).to.equals(`
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  role  Role    @default(USER)
}
`)
    })

    it('should generate model with relation', () => {
      const text = prismaSchemaToText({
        table_list: [user_table, post_table],
        enum_list: [],
      })
      expect(text).to.equals(`
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  role  Role    @default(USER)
  posts Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  title     String
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}
`)
    })

    it('should generate enum', () => {
      const text = prismaSchemaToText({
        table_list: [],
        enum_list: [role_enum],
      })
      expect(text).to.equals(`
enum Role {
  USER
  ADMIN
}
`)
    })

    it('should generate mixed schema', () => {
      const text = prismaSchemaToText(schema_ast)
      expect(text).to.equals(schema_text)
    })
  })
})
