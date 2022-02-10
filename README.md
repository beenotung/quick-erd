# quick-erd

quick and easy text-based ERD editor with drag and drop visualization

[![npm Package Version](https://img.shields.io/npm/v/quick-erd.svg?maxAge=3600)](https://www.npmjs.com/package/quick-erd)

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
  - [x] auto normalize specified column
  - [x] auto avoid table overlapping visually
  - [x] import/export diagram with drag position and zoom level

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

A set of available commands in example:

- `npx pg-to-erd > erd.txt`
- `npx sqlite-to-erd dev.sqlite3 > erd.txt`
- `npx erd-to-knex < erd.txt > migrations/000-create-tables.ts`
- `npx erd-to-sqlite < erd.txt > migrations/000-create-tables.sql`

#### Import from Existing Schema

1. Extract from live database

For Postgresql schema: Run `pg-to-erd`

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

## Todo

- update "auto place" algorithm to avoid relationship lines overlap the tables visually

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
