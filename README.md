# quick-erd

quick and easy text-based ERD editor with drag and drop visualization

[![npm Package Version](https://img.shields.io/npm/v/quick-erd.svg?maxAge=3600)](https://www.npmjs.com/package/quick-erd)

## Features

- [x] text-based erd editor
- [x] import from existing postgresql schema
- [x] generate knex migration (for initial schema)
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

1. Install this package globally, run: `npm i -g quick-erd`

For MacOS users, you may need sudo permission to install global package, e.g. by running: `sudo npm i -g quick-erd`

If you do not prefer to install global package, you can run below commands with npx, e.g. `npx pg-to-erd`

2. Setup database connection credential in `.env`.

This step is not needed for sqlite

You can refer to `.env.example`

#### Import from Existing Schema

1. Extract from live database

For Postgresql schema: Run `pg-to-erd`

For Sqlite schema: Run `sqlite-to-erd`

You can save the output into a file using pipe. e.g. by running: `pg-to-erd > erd.txt`

2. Copy the output text into the web erd editor

#### Export as Knex Migration Script

1. Run `erd-to-knex < erd.txt > migrate.ts`

You can save the erd text into a file, then load it as stdin. e.g. `erd-to-knex < erd.txt`

Also, you can save the result into a knex migration script. e.g.

```bash
# create migrations directory if not exist
mkdir -p migrations

# read from erd.txt, save to migrations/YYYYmmddHHMMSS-create-tables.ts
erd-to-knex < erd.txt > migrations/$(date +"%Y%m%d%H%M%S")-create-tables.ts
```

## Todo

- update "auto place" algorithm to avoid relationship lines overlap the tables visually
