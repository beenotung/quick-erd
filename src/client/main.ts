import { parse } from './ast'
import { DiagramController } from './diagram'
import { openDialog } from './dialog'
import { normalize } from './normalize'
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
  const dialog = openDialog(diagramController)
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
# ${location.origin}
#
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
#
////////////////////////////////////

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

document.querySelector('#normalize')?.addEventListener('click', showNormalize)

function showNormalize() {
  const dialog = openDialog(diagramController)
  dialog.innerHTML = /* html */ `
<label for="field">Field</label>
<input id="field" name="field" type="text">
<br>
<br>
<button class='cancel'>close</button>
<button class='confirm'>normalize</button>
`
  dialog.querySelector('.cancel')?.addEventListener('click', () => {
    dialog.remove()
  })
  dialog.querySelector('.confirm')?.addEventListener('click', () => {
    applyNormalize()
  })
  const field = dialog.querySelector('input') as HTMLInputElement
  field.focus()
  field.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      applyNormalize()
    }
  })
  function applyNormalize() {
    const name = field.value.trim()
    if (!name) return
    input.value = normalize(input.value, name)
    parseInput()
    localStorage.setItem('input', input.value)
  }
}

document.querySelector('#auto-place')?.addEventListener('click', () => {
  diagramController.autoPlace()
})

document.querySelector('#toggle-details')?.addEventListener('click', () => {
  diagramController.toggleDetails()
})

document.querySelector('#random-color')?.addEventListener('click', () => {
  diagramController.randomColor()
})

document.querySelector('#reset-color')?.addEventListener('click', () => {
  diagramController.resetColor()
})

document.querySelector('#reset-zoom')?.addEventListener('click', () => {
  diagramController.resetView()
})

function closeDialog() {
  const es = document.querySelectorAll('dialog')
  const last = es.item(es.length - 1)
  if (last) {
    last.remove()
  }
}

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
    case 'd':
    case 'D':
      diagramController.toggleDetails()
      return
    case 'c':
    case 'C':
      diagramController.randomColor()
      return
    case '0':
      diagramController.fontReset()
      return
    case 'r':
    case 'R':
      diagramController.resetView()
      return
    case 'n':
    case 'N':
      showNormalize()
      return
    case 'q':
    case 'Q':
      closeDialog()
      return
    default:
    // console.debug(e.key)
  }
})
