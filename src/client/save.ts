export function showSaveResult(
  saveBtn: HTMLButtonElement,
  result: Promise<{ error?: string }>,
) {
  result
    .catch(error => ({ error: String(error) }))
    .then(result => {
      if (!result.error) {
        saveBtn.textContent = 'Saved'
        saveBtn.style.color = 'green'
      } else {
        saveBtn.textContent = 'Failed'
        saveBtn.style.color = 'red'
      }
      setTimeout(() => {
        saveBtn.textContent = 'Save to Disk'
        saveBtn.style.color = ''
      }, 2000)
    })
}
