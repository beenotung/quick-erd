try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config()
} catch (error) {
  // dotenv is not installed, it is optional
}

export const env = process.env
