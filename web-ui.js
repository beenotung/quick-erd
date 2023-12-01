#!/usr/bin/env node

/**
 * Windows compatible version of "npm install" and "npm start"
 */

const { execSync } = require('child_process')
const { existsSync, mkdirSync, copyFileSync } = require('fs')

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
copyFileSync('src/client/index.html', 'build/index.html')
copyFileSync(
  'lib/ionicons/attach-outline.svg',
  'build/icons/attach-outline.svg',
)
copyFileSync('lib/ionicons/key-outline.svg', 'build/icons/key-outline.svg')
copyFileSync('lib/ionicons/snow-outline.svg', 'build/icons/snow-outline.svg')

run('npx serve-lite build')
