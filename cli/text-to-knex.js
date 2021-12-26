#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/src/db/text-to-knex.js')
} else {
  require('../dist/cjs/src/db/text-to-knex')
}
