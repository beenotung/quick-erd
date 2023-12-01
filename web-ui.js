#!/usr/bin/env node

const { execSync } = require('child_process')
const { existsSync, mkdirSync } = require('fs')

function run(cmd) {
  console.log('$ ' + cmd)
  execSync(cmd, { stdio: 'inherit' })
}

if (!existsSync('node_modules')) {
  run('npm install')
}

mkdirSync('build/icons', { recursive: true })
run('npm run build:client:js')
run('npm run build:client:css')
run('npm run build:client:html')
run('npm run build:client:icon')

run('npx serve-lite build')
