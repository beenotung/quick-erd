#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/src/db/pg-to-text.js')
} else {
  require('../dist/cjs/src/db/pg-to-text')
}
