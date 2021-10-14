#!/usr/bin/env node
let fs = require('fs')

let text = fs.readFileSync('package.json')
let pkg = JSON.parse(text)

pkg.type = 'module'

text = JSON.stringify(pkg, null, 2)
fs.writeFileSync('package.json', text)
