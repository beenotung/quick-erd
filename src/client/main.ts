const input = document.querySelector('#editor textarea') as HTMLTextAreaElement

input.value = localStorage.getItem('input') || input.value

window.addEventListener('storage', () => {
  input.value = localStorage.getItem('input') || input.value
})

input.addEventListener('input', () => {
  localStorage.setItem('input', input.value)
})
