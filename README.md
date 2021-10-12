# quick-erd

quick and easy text-based ERD editor with drag and drop visualization

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
3. Run `npm install`
4. Run `npm run dev`

### Import Existing Postgresql Schema

1. Update `package.json`:

Change the line from `"type": "module",` to `"type": "commonjs",`

2. Set the database connection credential in `.env`.

You can refer to `.env.example`

3. Run `npx ts-node src/db/pg-to-text`

You can save the output into a file using pipe. e.g. `npx ts-node src/db/pg-to-text > erd.txt`

4. Copy the output text into the web erd editor
