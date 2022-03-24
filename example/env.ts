import populateEnv from 'populate-env'
import { config } from 'dotenv'

config()

export let env = {
  DB_HOST: '',
  DB_NAME: '',
  DB_USERNAME: '',
  DB_PASSWORD: '',
}

populateEnv(env, { mode: 'halt' })
