import { toSafeMode, newDB } from 'better-sqlite3-schema'

export const dbFile = 'db.sqlite3'

export const db = newDB({
  path: dbFile,
  migrate: false,
})

toSafeMode(db)
