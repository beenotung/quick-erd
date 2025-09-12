import express from 'express'
import { erd_file, port } from './config'
import * as config from './config'
import { print } from 'listening-on'
import { resolve } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

/* eslint-disable no-console */

console.log('erd file: ' + erd_file)

if (!existsSync(erd_file)) {
  console.log('auto created empty erd file.')
  writeFileSync(erd_file, '')
}

const app = express()

app.get('/erd.txt', (req, res) => {
  res.sendFile(resolve(erd_file))
})

app.get('/erd-text.js', (req, res) => {
  const text = readFileSync(erd_file).toString()
  res.end(`
window.server_mode = 'enabled';
document.querySelector('.server-mode').style.display = 'block';
localStorage.erd = ${JSON.stringify(text)};
`)
})

app.put('/erd.txt', express.text({ type: 'plain/text' }), (req, res) => {
  const text = req.body
  if (typeof text !== 'string') {
    res.status(400)
    res.json({ error: 'expect erd text in plain text body' })
    return
  }

  console.log(`[${timestamp()}] updated ${erd_file}`)
  writeFileSync(erd_file, text)
  res.json({ message: 'updated' })
})

function timestamp() {
  const date = new Date()
  const d2 = (x: number) => (x < 10 ? '0' + x : x)
  return d2(date.getHours()) + ':' + d2(date.getMinutes())
}

app.use(express.static(config.public_dir))

app.listen(port, () => {
  print(port)
})
