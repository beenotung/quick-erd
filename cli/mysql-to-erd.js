#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/cli/mysql-to-erd.js')
} else {
  require('../dist/cjs/cli/mysql-to-erd')
}
