#!/usr/bin/env node
import fs from 'fs'

let text = fs.readFileSync('package.json')
let pkg = JSON.parse(text)

pkg.type = 'commonjs'

text = JSON.stringify(pkg, null, 2)
fs.writeFileSync('package.json', text)
