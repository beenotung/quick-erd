export function showCopyResult(
  copyBtn: HTMLButtonElement,
  result: Promise<boolean | 'skip'>,
) {
  result
    .catch(() => false)
    .then(done => {
      if (done == 'skip') return
      if (done) {
        copyBtn.textContent = 'copied'
        copyBtn.style.color = 'green'
      } else {
        copyBtn.textContent = 'failed'
        copyBtn.style.color = 'red'
      }
      setTimeout(() => {
        copyBtn.textContent = 'Copy'
        copyBtn.style.color = ''
      }, 2000)
    })
}
