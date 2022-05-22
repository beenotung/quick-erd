export const dbFile = process.argv[2]
if (!dbFile) {
  console.error('missing sqlite db filename in argument')
  process.exit(1)
}
