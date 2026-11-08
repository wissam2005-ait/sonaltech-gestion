// Serveur de test local : mêmes règles que sur Netlify, données dans un fichier JSON.
//   node --experimental-strip-types server/dev-server.mjs  (APP_PASSWORD=… PORT=8787)
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { handle } from './core.ts'

const FILE = process.env.STORE_FILE ?? '.dev-store.json'
const db = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {}
let v = 0
const save = () => writeFileSync(FILE, JSON.stringify(db))
const store = {
  async get(k) { return db[k] ? { data: structuredClone(db[k].data), etag: db[k].etag } : null },
  async setIfUnchanged(k, data, etag) { if ((db[k]?.etag) !== etag) return false; db[k] = { data, etag: String(++v) }; save(); return true },
  async put(k, data) { db[k] = { data, etag: String(++v) }; save() },
}
createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c)
  const r = await handle(new Request(`http://x${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks) }), store, process.env.APP_PASSWORD)
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(r.status === 204 ? undefined : Buffer.from(await r.arrayBuffer()))
}).listen(Number(process.env.PORT ?? 8787), () => console.log('API locale prête'))
