import { parse, Table } from './ast'
import {
  TableController,
  TableControllerElement,
  DiagramController,
} from './diagram'
const input = document.querySelector('#editor textarea') as HTMLTextAreaElement
const diagram = document.querySelector('#diagram') as HTMLDivElement

const diagramController = new DiagramController(diagram)

input.value = localStorage.getItem('input') || input.value
input.style.width = localStorage.getItem('input_width') || ''

window.addEventListener('storage', () => {
  input.value = localStorage.getItem('input') || input.value
})

input.addEventListener('input', () => {
  localStorage.setItem('input', input.value)
})

try {
  new MutationObserver(() => {
    localStorage.setItem('input_width', input.style.width)
  }).observe(input, { attributes: true })
} catch (error) {
  console.error('MutationObserver not supported')
}

function parseInput() {
  const result = parse(input.value)
  diagramController.render(result)
}
input.addEventListener('input', parseInput)
setTimeout(parseInput)

document.querySelector('#load-example')?.addEventListener('click', () => {
  if (!input.value.trim()) {
    loadExample()
    return
  }
  const dialog = document.createElement('dialog')
  dialog.setAttribute('open', '')
  document.body.appendChild(dialog)
  dialog.innerHTML = /* html */ `
<p>Confirm to overwrite existing content with example?</p>
<button class='cancel'>cancel</button>
<button class='danger'>confirm</button>
`
  dialog.querySelector('.cancel')?.addEventListener('click', () => {
    dialog.remove()
  })
  dialog.querySelector('.danger')?.addEventListener('click', () => {
    loadExample()
    dialog.remove()
  })
})

function loadExample() {
  input.value = `
user
-
id int pk
username text

post
-
id int pk
user_id int fk >- user.id

reply
-
id int pk
post_id int fk >- post.id
user_id int fk >- user.id
`.trim()
  parseInput()
}

document.querySelector('#auto-place')?.addEventListener('click', () => {
  diagramController.autoPlace()
})
