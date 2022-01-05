#!/usr/bin/env node

if (typeof module == 'undefined') {
  import('fs').then(main)
} else {
  main(require('fs'))
}

function main(fs) {
  let text = fs.readFileSync('package.json')
  let pkg = JSON.parse(text)

  pkg.type = process.argv[2]

  text = JSON.stringify(pkg, null, 2) + '\n'
  fs.writeFileSync('package.json', text)
}
