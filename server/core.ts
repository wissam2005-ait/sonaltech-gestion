/**
 * Serveur de synchronisation Sonaltech (indépendant de l'hébergeur : testé localement, exécuté sur Netlify).
 *
 * Règles :
 * - Chaque enregistrement porte `updatedAt` (heure de l'appareil) : le plus récent gagne.
 * - Rien n'est jamais effacé sur le serveur : une suppression = `deleted: true` (restaurable).
 * - `_srv` = heure du serveur à la réception ; un appareil récupère ce qui a changé depuis sa dernière visite.
 * - Une copie complète des données est gardée chaque jour (historique).
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const TABLES = ['clients', 'chantiers', 'articles', 'docs', 'employees', 'pointages', 'frais', 'settings'] as const
export type TableName = (typeof TABLES)[number]
export type Rec = { id: string | number; updatedAt: number; deleted?: boolean; _srv?: number; [k: string]: unknown }
type TableData = Record<string, Rec>

export interface Store {
  get(key: string): Promise<{ data: TableData; etag?: string } | null>
  /** Écrit seulement si la version n'a pas changé (etag) ; false = quelqu'un a écrit entre-temps. */
  setIfUnchanged(key: string, data: TableData, etag?: string): Promise<boolean>
  put(key: string, data: unknown): Promise<void>
}

const MAX_RECORDS_PER_PUSH = 5000

export function tokenFor(password: string) {
  return createHmac('sha256', password).update('sonaltech-gestion').digest('hex')
}
function sameText(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/* Mot de passe : APP_PASSWORD au départ, puis celui choisi dans l'application (enregistré haché dans la base). */
const PASSWORD_KEY = 'auth/password'
type StoredPassword = { salt: string; hash: string }
const hashPassword = (pw: string, salt: string) => scryptSync(pw, salt, 32).toString('hex')

async function storedPassword(store: Store): Promise<StoredPassword | null> {
  const cur = (await store.get(PASSWORD_KEY)) as { data?: unknown } | null
  const d = cur?.data as Partial<StoredPassword> | undefined
  return d && typeof d.salt === 'string' && typeof d.hash === 'string' ? { salt: d.salt, hash: d.hash } : null
}
async function passwordOk(store: Store, envPassword: string, candidate: string) {
  const st = await storedPassword(store)
  return st ? sameText(hashPassword(candidate, st.salt), st.hash) : sameText(candidate, envPassword)
}
/** Le jeton change quand le mot de passe change : les autres appareils doivent se reconnecter. */
async function currentToken(store: Store, envPassword: string) {
  const st = await storedPassword(store)
  return tokenFor(st ? st.hash : envPassword)
}

const json = (status: number, body: unknown) => new Response(status === 204 ? null : JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    // La version « fichier » (clé USB, origine null) peut aussi se synchroniser
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
})

/** Fusion d'une table : le plus récent gagne, rien n'est supprimé. Renvoie le nombre d'enregistrements modifiés. */
export function mergeInto(table: TableData, incoming: Rec[], now: number) {
  let changed = 0
  for (const r of incoming) {
    if (r == null || (typeof r.id !== 'string' && typeof r.id !== 'number') || typeof r.updatedAt !== 'number') continue
    const key = String(r.id)
    const cur = table[key]
    if (!cur || r.updatedAt > cur.updatedAt) {
      table[key] = { ...r, _srv: now }
      changed++
    }
  }
  return changed
}

export async function handle(req: Request, store: Store, password: string | undefined): Promise<Response> {
  if (req.method === 'OPTIONS') return json(204, null)
  const path = new URL(req.url).pathname
  if (!password) return json(503, { error: 'Synchronisation non configurée : définissez APP_PASSWORD chez l’hébergeur.' })

  if (path.endsWith('/api/login') && req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as { password?: string }
    if (!body.password || !(await passwordOk(store, password, body.password))) return json(401, { error: 'Mot de passe incorrect.' })
    return json(200, { token: await currentToken(store, password) })
  }

  if (path.endsWith('/api/password') && req.method === 'POST') {
    const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    if (!sameText(auth, await currentToken(store, password))) return json(401, { error: 'Session expirée : reconnectez-vous.' })
    const body = (await req.json().catch(() => ({}))) as { current?: string; next?: string }
    if (!body.current || !(await passwordOk(store, password, body.current))) return json(401, { error: 'Mot de passe actuel incorrect.' })
    if (typeof body.next !== 'string' || body.next.length < 8) return json(400, { error: 'Le nouveau mot de passe doit faire au moins 8 caractères.' })
    const salt = randomBytes(16).toString('hex')
    await store.put(PASSWORD_KEY, { salt, hash: hashPassword(body.next, salt) })
    return json(200, { token: await currentToken(store, password) })
  }

  if (path.endsWith('/api/sync') && req.method === 'POST') {
    const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
    if (!sameText(auth, await currentToken(store, password))) return json(401, { error: 'Session expirée : reconnectez-vous.' })
    const body = (await req.json().catch(() => null)) as { since?: number; changes?: Partial<Record<TableName, Rec[]>> } | null
    if (!body) return json(400, { error: 'Requête invalide.' })
    const since = typeof body.since === 'number' ? body.since : 0
    const total = Object.values(body.changes ?? {}).reduce((s, l) => s + (l?.length ?? 0), 0)
    if (total > MAX_RECORDS_PER_PUSH) return json(413, { error: 'Trop de modifications en une fois.' })

    const now = Date.now()
    const out: Partial<Record<TableName, Rec[]>> = {}
    const snapshot: Partial<Record<TableName, TableData>> = {}
    for (const t of TABLES) {
      const incoming = (body.changes?.[t] ?? []) as Rec[]
      let data: TableData = {}
      for (let attempt = 0; attempt < 6; attempt++) {
        const cur = await store.get(`t/${t}`)
        data = cur?.data ?? {}
        if (!incoming.length) break
        if (!mergeInto(data, incoming, now)) break
        if (await store.setIfUnchanged(`t/${t}`, data, cur?.etag)) break
        if (attempt === 5) return json(409, { error: 'Serveur occupé, réessayez.' })
      }
      snapshot[t] = data
      out[t] = Object.values(data).filter((r) => (r._srv ?? 0) > since)
    }
    if (total > 0) await store.put(`backup/${new Date(now).toISOString().slice(0, 10)}`, snapshot)
    return json(200, { now, changes: out })
  }

  return json(404, { error: 'Introuvable.' })
}
