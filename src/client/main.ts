import { parse, ParseResult } from '../core/ast'
import { makeGuide } from '../core/guide'
import { astToText } from '../core/table'
import { ColorController } from './color'
import { DiagramController } from './diagram'
import { openDialog } from './dialog'
import { ErdInputController } from './erd-input'
import { normalize } from './normalize'
import { cleanStorage, StoredString } from './storage'
import { QueryInputController } from './query-input'

const root = document.querySelector(':root') as HTMLElement
const editor = document.querySelector('#editor') as HTMLTextAreaElement
const erdInput = editor.querySelector('#erdInput') as HTMLTextAreaElement
const queryInput = editor.querySelector('#queryInput') as HTMLTextAreaElement
const diagram = document.querySelector('#diagram') as HTMLDivElement

const tableStub = document.querySelector(
  '[data-table="_stub_"]',
) as HTMLDivElement

cleanStorage()

if (localStorage.input && !localStorage.erd) {
  localStorage.erd = localStorage.input
  delete localStorage.input
}

const erdText = new StoredString('erd', erdInput.value)
const queryText = new StoredString('query', queryInput.value)
const inputWidth = new StoredString('input_width', erdInput.style.width)
const modeText = new StoredString('mode', 'schema')

document.body.dataset.mode = modeText.value

const erdInputController = new ErdInputController(erdInput, erdText)
const colorController = new ColorController(
  root,
  { editor, input: erdInput, diagram, tableStub },
  erdInputController,
)
const queryInputController = new QueryInputController(
  queryInput,
  queryText,
  (): ParseResult['table_list'] => diagramController.getTableList(),
)
const diagramController = new DiagramController(
  diagram,
  erdInputController,
  colorController,
  queryInputController,
)

erdInput.value = erdText.value
erdInput.style.width = inputWidth.value

queryInput.value = queryText.value
queryInput.style.width = inputWidth.value

erdText.watch(text => {
  erdInput.value = text
})

erdInput.addEventListener('input', event => {
  erdText.value = erdInput.value
  checkNewTable(event as InputEvent)
})

function checkNewTable(event: InputEvent) {
  if (!(event.inputType == 'insertText' && event.data == '-')) return
  if (erdInput.selectionStart != erdInput.selectionEnd) return

  let index = erdInput.selectionStart

  const before = erdInput.value.slice(0, index)
  if (!before.endsWith('\n-')) return

  const after = erdInput.value.slice(index)

  const tableName = before.split('\n').slice(-2)[0]
  if (!tableName) return

  const mid = '-'.repeat(tableName.length - 1) + '\nid\n'

  erdInput.value = before + mid + after
  index += mid.length

  erdInput.selectionStart = index
  erdInput.selectionEnd = index
}

queryText.watch(text => {
  queryInput.value = text
})

queryInput.addEventListener('input', event => {
  queryText.value = queryInput.value
  checkQueryInput(event as InputEvent)
})

function checkQueryInput(_event: InputEvent) {
  const s = queryInput.selectionStart
  const e = queryInput.selectionEnd
  const columns = queryInputController.checkUpdate(queryInput.value)
  if (columns) {
    diagramController.applySelectedColumns(columns)
  }
  queryInput.selectionStart = s
  queryInput.selectionEnd = e
}

try {
  new MutationObserver(() => {
    inputWidth.value = erdInput.style.width
  }).observe(erdInput, { attributes: true })
  new MutationObserver(() => {
    inputWidth.value = queryInput.style.width
  }).observe(queryInput, { attributes: true })
} catch (error) {
  console.error('MutationObserver not supported')
}

function parseErdInput() {
  const result = parse(erdInput.value)
  diagramController.render(result)
  if (result.textBgColor) {
    colorController.textBgColor.applyParsedColor(result.textBgColor)
  }
  if (result.textColor) {
    colorController.textColor.applyParsedColor(result.textColor)
  }
  if (result.diagramBgColor) {
    colorController.diagramBgColor.applyParsedColor(result.diagramBgColor)
  }
  if (result.tableBgColor) {
    colorController.tableBgColor.applyParsedColor(result.tableBgColor)
  }
  if (result.tableTextColor) {
    colorController.tableTextColor.applyParsedColor(result.tableTextColor)
  }
}
erdInput.addEventListener('input', parseErdInput)

document.querySelector('#export')?.addEventListener('click', () => {
  const dialog = openDialog(diagramController)
  dialog.innerHTML = /* html */ `
<textarea cols=30></textarea>
<p style='color: black'>not copied in clipboard</p>
<button class='cancel'>close</button>
<button class='confirm'>copy</button>
`
  const textarea = dialog.querySelector('textarea') as HTMLTextAreaElement
  const p = dialog.querySelector('p') as HTMLDivElement
  const json = { input: erdInput.value }
  diagramController.exportJSON(json)
  textarea.value = JSON.stringify(json)
  dialog.querySelector('.cancel')?.addEventListener('click', () => {
    dialog.remove()
  })
  dialog.querySelector('.confirm')?.addEventListener('click', () => {
    textarea.select()
    if (document.execCommand('copy')) {
      p.textContent = 'copied to clipboard'
      p.style.color = 'green'
    } else {
      p.textContent =
        'copy to clipboard is not supported, please copy it manually'
      p.style.color = 'red'
    }
  })
})

document.querySelector('#import')?.addEventListener('click', () => {
  const dialog = openDialog(diagramController)
  dialog.innerHTML = /* html */ `
<textarea cols=30></textarea>
<p style='color: black'>not imported yet</p>
<button class='cancel'>close</button>
<button class='confirm'>import</button>
`
  const textarea = dialog.querySelector('textarea') as HTMLTextAreaElement
  const p = dialog.querySelector('p') as HTMLDivElement
  dialog.querySelector('.cancel')?.addEventListener('click', () => {
    dialog.remove()
  })
  dialog.querySelector('.confirm')?.addEventListener('click', () => {
    try {
      const json = JSON.parse(textarea.value)

      const zoom = +json.zoom
      if (zoom) {
        erdInput.value = ''
        parseErdInput()
        diagramController.zoom.value = zoom
        diagramController.applyFontSize()
      }

      Object.assign(localStorage, json)

      erdInput.value = json.input
      parseErdInput()

      p.textContent = 'import successfully'
      p.style.color = 'green'
    } catch (error) {
      p.textContent = 'invalid json'
      p.style.color = 'red'
    }
  })
})

document.querySelector('#load-example')?.addEventListener('click', () => {
  if (!erdInput.value.trim()) {
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
  erdInput.value = `
${makeGuide(location.origin)}


user
----
id pk
username varchar(64)


post
----
id pk
author_id fk >- user.id
content text
status enum('active','pending')


reply
-----
id pk
# column "{table}_id" ends with "fk" will be interpreted as implicitly referencing to
# "{table}.id" with ">-" relationship
post_id fk # e.g. post_id references to post.id
user_id fk
reply_id null fk # it's fine to include other modifiers in the middle
content text
`.trim()
  parseErdInput()
}

document.querySelector('#format')?.addEventListener('click', format)

function format() {
  diagramController.flushToInputController()
  colorController.flushToInputController()
  const result = parse(erdInput.value)
  erdInput.value = astToText(result) + '\n'
}

document.querySelector('#normalize')?.addEventListener('click', showNormalize)

function showNormalize() {
  const dialog = openDialog(diagramController)
  dialog.innerHTML = /* html */ `
<label for="field">field:</label>
<br>
<input id="field" name="field" type="text">
<br>
<br>
<label for="table">table (optional):</label>
<br>
<input id="table" name="table" type="text">
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
  const field = dialog.querySelector('input[name=field]') as HTMLInputElement
  const table = dialog.querySelector('input[name=table]') as HTMLInputElement
  field.addEventListener('keypress', onKeypress)
  table.addEventListener('keypress', onKeypress)
  function onKeypress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      applyNormalize()
    }
  }
  function applyNormalize() {
    const fieldName = field.value.trim()
    if (!fieldName) return
    const tableName = table.value.trim() || fieldName
    erdInput.value = normalize(erdInput.value, fieldName, tableName)
    parseErdInput()
    erdText.value = erdInput.value
  }
  field.focus()
}

document.querySelector('#auto-place')?.addEventListener('click', () => {
  diagramController.autoPlace()
})

document.querySelector('#toggle-details')?.addEventListener('click', () => {
  diagramController.toggleDetails()
})

document.querySelector('#schema-mode')?.addEventListener('click', () => {
  switchMode('schema')
})

document.querySelector('#query-mode')?.addEventListener('click', () => {
  switchMode('query')
})

document.querySelector('#random-color')?.addEventListener('click', () => {
  diagramController.randomColor()
})

document.querySelector('#reset-color')?.addEventListener('click', () => {
  colorController.resetColors()
  diagramController.resetColor()
})

document.querySelector('#reset-zoom')?.addEventListener('click', () => {
  diagramController.resetView()
})

function switchMode(mode: string) {
  document.body.dataset.mode = mode
  modeText.value = mode
  diagramController.renderLines()
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
    case 's':
    case 'S':
      switchMode('schema')
      return
    case 'q':
    case 'Q':
      switchMode('query')
      return
    case 'r':
    case 'R':
      diagramController.resetView()
      return
    case 'n':
    case 'N':
      showNormalize()
      return
    default:
    // console.debug(e.key)
  }
})

parseErdInput()
queryInputController.cleanColumns()
