import { config } from 'dotenv'
import populateEnv from 'populate-env'

config()

export const env = {
  DB_HOST: 'optional',
  DB_CLIENT: 'better-sqlite3',
  DB_NAME: '',
  DB_USERNAME: '',
  DB_PASSWORD: '',
}

populateEnv(env, { mode: 'halt' })

env.DB_HOST = process.env.DB_HOST!
