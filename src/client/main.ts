import { parse } from './ast'
import { DiagramController } from './diagram'
const input = document.querySelector('#editor textarea') as HTMLTextAreaElement
const fontSize = document.querySelector('#font-size') as HTMLSpanElement
const diagram = document.querySelector('#diagram') as HTMLDivElement

const diagramController = new DiagramController(diagram, fontSize)

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
  dialog.style.zIndex = diagramController.getSafeZIndex().toString()
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
# Relationship Types
#  -    - one to one
#  -<   - one to many
#  >-   - many to one
#  >-<  - many to many
#  -0   - one to zero or one
#  0-   - zero or one to one
#  0-0  - zero or one to zero or one
#  -0<  - one to zero or many
#  >0-  - zero or many to one

user
----
id pk
username text

post
----
id pk
user_id fk >- user.id

reply
-----
id pk
post_id fk >- post.id
user_id fk >- user.id # inline comment
reply_id null fk >- reply.id
`.trim()
  parseInput()
}

document.querySelector('#auto-place')?.addEventListener('click', () => {
  diagramController.autoPlace()
})

document.querySelector('#reset-zoom')?.addEventListener('click', () => {
  diagramController.fontReset()
})

window.addEventListener('keypress', e => {
  const tagName = document.activeElement?.tagName
  if (tagName === 'TEXTAREA' || tagName === 'INPUT') return
  switch (e.key) {
    case '-':
    case '_':
      diagramController.fontDec()
      return
    case '+':
    case '=':
      diagramController.fontInc()
      return
    case 'a':
    case 'A':
      diagramController.autoPlace()
      return
    case '0':
    case 'r':
    case 'R':
      diagramController.fontReset()
      return
    default:
    // console.debug(e.key)
  }
})
