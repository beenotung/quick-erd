import { existsSync } from 'fs'
import { join } from 'path'

export let port = +process.env.PORT! || 8520
{
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    if (arg == '-p' || arg == '--port') {
      port = +process.argv[++i]
      if (!port) {
        console.error('Invalid port: ' + process.argv[i])
        process.exit(1)
      }
    }
  }
}

export const public_dir = join(__dirname, '..', '..', 'build')
{
  const file = join(public_dir, 'index.html')
  if (!existsSync(file)) {
    console.error('Could not locate public directory')
    process.exit(1)
  }
}

export let erd_file = ''
{
  const files = [
    /* in current directory */
    'erd.txt',
    /* in ts-liveview db project */
    'db/erd.txt',
    /* in case it is put into the docs directory */
    'docs/erd.txt',
    '../docs/erd.txt',
  ]
  for (const file of files) {
    if (existsSync(file)) {
      erd_file = file
      break
    }
  }

  for (let i = 2; i < process.argv.length; i++) {
    const file = process.argv[i]
    if (file.includes('erd.txt') || existsSync(file)) {
      erd_file = file
      break
    }
  }

  if (!erd_file) {
    console.error('Missing erd.txt file')
    console.error(
      'Specify it in the argument - it will auto-create an empty file.',
    )
    process.exit(1)
  }
}
