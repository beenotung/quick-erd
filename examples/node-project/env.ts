import { config } from 'dotenv'
import populateEnv from 'populate-env'

config()

export const env = {
  DB_CLIENT: 'better-sqlite3',
  DB_NAME: '',
  DB_USERNAME: '',
  DB_PASSWORD: '',
  DB_PORT: 5432,
  DB_HOST: 'localhost',
}

populateEnv(env, { mode: 'halt' })
