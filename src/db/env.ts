try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ quiet: true })
} catch (error) {
  // dotenv is not installed, it is optional
}

export const env = process.env
