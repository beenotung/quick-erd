#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/cli/erd-to-sqlite.js')
} else {
  require('../dist/cjs/cli/erd-to-sqlite')
}
