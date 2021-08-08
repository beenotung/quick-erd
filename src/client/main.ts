const input = document.querySelector('#editor textarea') as HTMLTextAreaElement

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
