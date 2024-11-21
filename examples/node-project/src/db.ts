import { toSafeMode, newDB, DBInstance } from 'better-sqlite3-schema'
import { basename, join } from 'path'

function resolveFile(file: string) {
  return basename(process.cwd()) == 'dist' ? join('..', file) : file
}

export const dbFile = resolveFile('db.sqlite3')

export const db: DBInstance = newDB({
  path: dbFile,
  migrate: false,
})

toSafeMode(db)
