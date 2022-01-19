import { scanSqliteTableSchema } from '../db/sqlite-to-text'
import { printTables } from '../db/table'

function main() {
  const tables = scanSqliteTableSchema()
  printTables(tables)
}

main()
