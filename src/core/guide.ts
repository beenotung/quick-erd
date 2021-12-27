export function makeGuide(origin: string) {
  return `
# Visualize on ${origin}
#
# Relationship Types
#  -    - one to one
#  -<   - one to many
#  >-   - many to one
#  >-<  - many to many
#  -0   - one to zero or one
#  0-   - zero or one to one
#  0-0  - zero or one to zero or one
#  -0<  - one to zero or many
#  >0-  - zero or many to one
#
////////////////////////////////////
`.trim()
}
