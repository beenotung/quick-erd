export function normalize(text: string, field: string): string {
  text = text
    .split('\n')
    .map(line => {
      const parts = line.split('#')
      parts[0] = parts[0].replace(
        `${field} text`,
        `${field}_id fk >- ${field}.id `,
      )
      return parts.join('#')
    })
    .join('\n')
  text += `
${field}
${'-'.repeat(field.length)}
id pk
${field} text
`
  return text
}
