#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/cli/sqlite-to-erd.js')
} else {
  require('../dist/cjs/cli/sqlite-to-erd')
}
