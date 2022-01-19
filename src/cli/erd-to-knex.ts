import { textToKnex } from '../db/text-to-knex'

function main() {
  let text = ''
  process.stdin
    .on('data', chunk => (text += chunk))
    .on('end', () => {
      if (!text) {
        console.error('missing erd text from stdin')
        process.exit(1)
      }
      let code = textToKnex(text)
      // eslint-disable-next-line no-console
      console.log(code)
    })
}

main()
