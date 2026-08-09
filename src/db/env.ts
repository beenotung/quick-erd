function getEnvFile() {
  try {
    let populateEnv = require('populate-env')
    let envFile = populateEnv.getEnvFile()
    return envFile
  } catch (error) {
    // populate-env is not installed, it is optional
    let fs = require('fs')
    if (fs.existsSync('.env')) {
      return '.env'
    }
  }
}

let process = require('process')
let envFile = getEnvFile()
if (envFile) {
  process.loadEnvFile(envFile)
}

export const env = process.env
