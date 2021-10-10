# quick-erd

quick and easy text-based ERD

[![npm Package Version](https://img.shields.io/npm/v/quick-erd.svg?maxAge=3600)](https://www.npmjs.com/package/quick-erd)


## Features

- [x] text-based erd editor
- [x] web-based visualization with drag-and-drop moving
- [x] import from existing postgresql schema

## Usage

### ERD Editing

Option 1: Run it online

Hosted on https://erd.surge.sh and https://quick-erd.surge.sh

Option 2: Run it locally

1. Clone this git repository
2. cd into the folder
3. run `npm install`
4. run `npm run dev`

### Import Existing Postgresql Schema

1. update `package.json`.

Change the line from `"type": "module",` to `"type": "not_module",`

2. set the database connection credential in `.env`.

You can refer to `.env.example`

3. run `npx ts-node src/db/pg.ts`
