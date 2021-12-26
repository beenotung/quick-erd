#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/db/pg-to-text.js')
} else {
  require('../dist/cjs/db/pg-to-text')
}
