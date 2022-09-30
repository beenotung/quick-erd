# quick-erd

quick and easy text-based ERD editor with drag and drop visualization

[![npm Package Version](https://img.shields.io/npm/v/quick-erd)](https://www.npmjs.com/package/quick-erd)
[![npm Package Downloads](https://img.shields.io/npm/dy/quick-erd)](https://www.npmtrends.com/quick-erd)

## Features

- [x] text-based erd editor
- [x] import from existing postgresql schema
- [x] generate (initial) database schema migration
  - [x] knex migrate script
  - [x] sqlite migrate statements
- [x] published as npx script
- [x] web-based visualization
  - [x] zoom in/out
  - [x] drag-and-drop moving
  - [x] show/hide non-relational columns
  - [x] plain/colorful table heading
  - [x] keyboard shortcuts
  - [x] auto save-and-restore with localStorage
  - [x] auto format the schema text
  - [x] auto normalize specified column
  - [x] auto avoid table overlapping visually
  - [x] import/export diagram with drag position and zoom level
  - [x] right-click on diagram to select table/column in editor

## Usage

### ERD Editing

Option 1: Run it online

Hosted on https://erd.surge.sh and https://quick-erd.surge.sh

Option 2: Run it locally

1. Clone this git repository
2. cd into the folder
3. Run `npm install`
4. Run `npm run dev`

### Database Utility

#### Setup

1. Install this package as devDependency, run `npm i -D quick-erd`

2. Setup database connection credential in `.env`.

`.env` is not needed for sqlite

You can refer to `.env.example`

#### Overview of Commands

Below are available commands in example.

**To reverse-engineer erd file from live database**:

- `npx pg-to-erd > erd.txt`
- `npx mysql-to-erd > erd.txt`
- `npx sqlite-to-erd dev.sqlite3 > erd.txt`

**To generate initial database migration script from erd file**:

- `npx erd-to-knex < erd.txt > migrations/001-create-tables.ts`
- `npx erd-to-sqlite < erd.txt > migrations/001-create-tables.sql`

**To generate incremental database migration script from erd file and live database**:

- `npx auto-migrate pg < erd.txt`
- `npx auto-migrate mysql < erd.txt`
- `npx auto-migrate dev.sqlite3 < erd.txt`
- `npx auto-migrate --rename pg < erd.txt`

**To generate types and proxy schema for better-sqlite3-proxy**:

- `npx erd-to-proxy < erd.txt > proxy.ts`
- `npx erd-to-proxy --factory < erd.txt > proxy.ts`

**To format erd file**:

- `npx format-erd erd.txt`
- `npx format-erd --ref ordered_erd.txt new_erd.txt`

**To update erd file from live database**:

```bash
npx pg-to-erd > erd.tmp
npx format-erd -r erd.txt erd.tmp
meld erd.txt erd.tmp
rm erd.tmp
```

#### Import from Existing Schema

1. Extract from live database

For Postgresql schema: Run `pg-to-erd`

For Mysql/MariaDB schema: Run `mysql-to-erd`

For Sqlite schema: Run `sqlite-to-erd SQLITE_FILENAME`

You can save the output into a file using pipe. e.g. by running: `pg-to-erd > erd.txt`

2. Copy the output text into the web erd editor

#### Export as Migration Script

You can export the erd.txt to a database migration script. This process is also called forward-engineering for database schema.

Supported schema format includes: [knex](https://github.com/knex/knex) and [better-sqlite3-helper](https://github.com/Kauto/better-sqlite3-helper)

##### Export as Knex Migration Script

1. Run `erd-to-knex < erd.txt > migrate.ts`

You can save the erd text into a file, then load it as stdin. e.g. `erd-to-knex < erd.txt`

Also, you can save the result into a knex migration script. e.g.

```bash
# create migrations directory if not exist
mkdir -p migrations

# read from erd.txt, save to migrations/YYYYmmddHHMMSS-create-tables.ts
erd-to-knex < erd.txt > migrations/$(date +"%Y%m%d%H%M%S")-create-tables.ts
```

##### Export as Sqlite Migration Script

1. Run `erd-to-sqlite < erd.txt > migrate.sql`

Depending on your migration directory (default is ./migrations/), you may save the migration script in corresponding directory. e.g.

```bash
# create migrations directory if not exist
mkdir -p migrations

# read from erd.txt, save to migrations/000-create-tables.sql
erd-to-sqlite < erd.txt > migrations/000-create-tables.sql
```

##### Generate Incremental Knex Migration Script

1. Run `npx auto-migrate dev.sqlite3 < erd.txt`

   or `npx auto-migrate mysql < erd.txt`

   or `npx auto-migrate pg < erd.txt`

   or `npx auto-migrate --rename pg < erd.txt`

This command auto setup knex, then it generates incremental migration script for knex.

For sqlite database, it also auto setup `db.ts` with `better-sqlite3` connection using given database filename.

The `--rename` or `-r` flag enable column rename detection.

If there are pending knex migrations not applied, it will show error message and stop running.

#### Generate types and proxy schema for better-sqlite3-proxy

1. Run `npx erd-to-proxy < erd.txt > proxy.ts`

This command generate the typescript types of each table and the schema for `proxySchema()` in [better-sqlite3-proxy](https://github.com/beenotung/better-sqlite3-proxy)

The relation fields are also included based on the foreign key references.

**Additional arguments**:

- export format:

  - `--factory`
  - `--singleton` (default)

- import format:
  - `--commonjs` or `--cjs` (default)
  - `--module` or `--esm`

_Export Format_:

The default behaviour is to generate a proxy as singleton with commonjs format.

If a factory function is preferred, you can pass `--factory` in the argument, e.g. `npx erd-to-proxy --factory < erd.txt > proxy.ts`

_Import Format_:

In commonjs mode, the import path of local typescript files should not include `.js` extension;
In esm module, the import path of local files should include `.js` extension.

In the generated proxy file, it needs to import the local file `db.ts`. This tool will try to read the `type` field in `package.json` to determine the import format, and fallback to use "commonjs" format if undetermined.

If esm format is preferred but undetected, you can pass `--esm` in the argument, e.g. `npx erd-to-proxy --esm < erd.txt > proxy.ts`

#### Format Diagram Text

To "prettify" the erd, run: `format-erd erd.txt`

To sort the tables and fields of exported erd according to previous version of erd, run:
`format-erd --ref old_erd.txt new_erd.txt`

The original text file will be backup with suffix, e.g. 'erd.txt.bk_20220212144828'

The formatted erd text will be saved in-place.

Warning: Comments are not preserved in the current version. If you want to restore the comments, you may use diff tools like [meld](https://meldmerge.org/) to compare the formatted version and original version.

## Todo

- to support composite primary keys
- to support composite unique keys

- update "auto place" algorithm to avoid relationship lines overlap the tables visually

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
