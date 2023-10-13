import { toSafeMode, newDB, DBInstance } from 'better-sqlite3-schema'

export const dbFile = 'db.sqlite3'

export const db: DBInstance = newDB({
  path: dbFile,
  migrate: false,
})

toSafeMode(db)
