#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/cli/erd-to-knex.js')
} else {
  require('../dist/cjs/cli/erd-to-knex')
}
