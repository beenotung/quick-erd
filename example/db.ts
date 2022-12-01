import { toSafeMode, newDB } from 'better-sqlite3-schema'

export let dbFile = 'db.sqlite3'

export let db = newDB({
  path: dbFile,
  migrate: false,
})

toSafeMode(db)
