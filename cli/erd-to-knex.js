#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/db/text-to-knex.js')
} else {
  require('../dist/cjs/db/text-to-knex')
}
