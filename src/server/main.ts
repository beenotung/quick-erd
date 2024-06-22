import express from 'express'
import { erd_file, port, public_dir } from './config'
import { print } from 'listening-on'
import { resolve } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

console.log('erd file: ' + erd_file)

if (!existsSync(erd_file)) {
  console.log('auto created empty erd file.')
  writeFileSync(erd_file, '')
}

let app = express()

app.get('/erd.txt', (req, res) => {
  res.sendFile(resolve(erd_file))
})

app.get('/erd-text.js', (req, res) => {
  let text = readFileSync(erd_file).toString()
  res.end(`
window.server_mode = 'enabled';
document.querySelector('.server-mode').style.display = 'block';
localStorage.erd = ${JSON.stringify(text)};
`)
})

app.put('/erd.txt', express.text({ type: 'plain/text' }), (req, res) => {
  let text = req.body
  if (typeof text !== 'string') {
    res.status(400)
    res.json({ error: 'expect erd text in plain text body' })
    return
  }
  console.log('updated', erd_file)
  writeFileSync(erd_file, text)
  res.json({ message: 'updated' })
})

app.use(express.static(public_dir))

app.listen(port, () => {
  print(port)
})
