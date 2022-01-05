#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/db/sqlite-to-text.js')
} else {
  require('../dist/cjs/db/sqlite-to-text')
}
