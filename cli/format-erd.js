#!/usr/bin/env node
if (typeof module == 'undefined') {
  import('../dist/esm/cli/format-erd.js')
} else {
  require('../dist/cjs/cli/format-erd')
}
