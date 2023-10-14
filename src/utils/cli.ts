export type DBClient = ReturnType<typeof detectDBClient>

export function detectDBClient(dbFile_or_client: string) {
  switch (dbFile_or_client) {
    case 'mysql':
      return 'mysql' as const
    case 'pg':
    case 'postgresql':
      return 'postgresql' as const
    default: {
      return 'better-sqlite3' as const
    }
  }
}
