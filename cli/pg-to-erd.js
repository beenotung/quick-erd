#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/cli/pg-to-erd.js')
} else {
  require('../dist/cjs/cli/pg-to-erd')
}
