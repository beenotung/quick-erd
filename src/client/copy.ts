export function showCopyResult(
  copyBtn: HTMLButtonElement,
  result: Promise<boolean | 'skip'>,
) {
  result
    .catch(() => false)
    .then(done => {
      if (done == 'skip') return
      if (done) {
        copyBtn.textContent = 'Copied'
        copyBtn.style.color = 'green'
      } else {
        copyBtn.textContent = 'Failed'
        copyBtn.style.color = 'red'
      }
      setTimeout(() => {
        copyBtn.textContent = 'Copy'
        copyBtn.style.color = ''
      }, 2000)
    })
}
