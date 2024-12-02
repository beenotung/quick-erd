export function normalize(text: string, field: string, table: string): string {
  const textFieldRegex = new RegExp('^' + field + '\\s+text', 'i')
  const refField = `${table}_id fk >0- ${table}.id `

  const lines = text.split('\n')

  text = lines
    .map((line, i, lines) => {
      const parts = line.split('#')

      let part = parts[0].replace(textFieldRegex, refField)

      if (part === field) {
        const minimumLines = lines
          .slice(i + 1)
          .map(line => line.replace(/#.*/g, '').trim())
          .filter(line => line)
        const nextLine = minimumLines[0]
        if (nextLine?.[0] !== '-') {
          // this line is not table name
          part = refField
        }
      }

      parts[0] = part

      return parts.join('#')
    })
    .join('\n')

  if (!text.endsWith('\n')) {
    text += '\n'
  }
  text += `
${table}
${'-'.repeat(table.length)}
id pk
${field} text
`
  return text
}
