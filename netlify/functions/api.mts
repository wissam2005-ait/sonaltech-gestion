import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'
import { handle, type Store } from '../../server/core'

/** API Netlify : /api/login et /api/sync. Données dans Netlify Blobs (permanentes, rien n'est effacé). */
export default async (req: Request) => {
  const blobs = getStore({ name: 'sonaltech', consistency: 'strong' })
  const store: Store = {
    async get(key) {
      const r = await blobs.getWithMetadata(key, { type: 'json' })
      return r ? { data: r.data as never, etag: r.etag } : null
    },
    async setIfUnchanged(key, data, etag) {
      const r = etag ? await blobs.setJSON(key, data, { onlyIfMatch: etag }) : await blobs.setJSON(key, data, { onlyIfNew: true })
      return r.modified
    },
    async put(key, data) { await blobs.setJSON(key, data) },
  }
  return handle(req, store, process.env.APP_PASSWORD)
}

export const config: Config = { path: ['/api/login', '/api/sync', '/api/password'] }
