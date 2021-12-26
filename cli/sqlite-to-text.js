#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/src/db/sqlite-to-text.js')
} else {
  require('../dist/cjs/src/db/sqlite-to-text')
}
