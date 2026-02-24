/**
 * This file is auto generated, do not edit it manually.
 *
 * update command: npx erd-to-proxy < erd.txt > proxy.ts
 */

import { proxySchema } from 'better-sqlite3-proxy'
import { db } from './db'

export type User = {
  id?: null | number
  role: ('admin' | 'guest' | 'moderator')
}

export type Acl = {
  id?: null | number
  role: string
  permission: ('create' | 'read' | 'update' | 'delete' | 'share')
}

export type DBProxy = {
  user: User[]
  acl: Acl[]
}

export let proxy = proxySchema<DBProxy>({
  db,
  tableFields: {
    user: [],
    acl: [],
  },
})
