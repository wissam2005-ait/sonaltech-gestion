import { useSyncExternalStore } from 'react'
import { db, LOCAL_SETTINGS, setLocalChangeListener, SYNC_TABLES, type SyncTable } from './db'

/* -------------------------------------------------------------------------------------------- */
/* Enregistrement sur le site. L'application marche sans internet : les modifications attendent */
/* sur l'appareil et partent dès que la connexion revient. Les autres appareils les reçoivent.  */
/* -------------------------------------------------------------------------------------------- */

const LS = { token: 'sonaltech.token', since: 'sonaltech.since', server: 'sonaltech.server' }
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* rien */ } },
  del: (k: string) => { try { localStorage.removeItem(k) } catch { /* rien */ } },
}

/** Adresse du site. Version en ligne : le site lui-même. Version fichier (clé USB) : à indiquer dans Paramètres. */
export const isFileVersion = () => location.protocol === 'file:'
export const getServer = () => (isFileVersion() ? (ls.get(LS.server) ?? import.meta.env.VITE_SYNC_URL ?? '') : '').replace(/\/+$/, '')
export const setServer = (url: string) => { ls.set(LS.server, url.trim().replace(/\/+$/, '')); void syncNow() }

export type SyncState = 'ok' | 'syncing' | 'pending' | 'offline' | 'login' | 'error' | 'noserver'
interface Status { state: SyncState; pending: number; lastSync: number | null; message: string }
let status: Status = { state: 'pending', pending: 0, lastSync: Number(ls.get('sonaltech.lastSync')) || null, message: '' }
const listeners = new Set<() => void>()
const setStatus = (s: Partial<Status>) => { status = { ...status, ...s }; listeners.forEach((l) => l()) }
export const useSyncStatus = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => status)

export const isLoggedIn = () => !!ls.get(LS.token)

export async function login(password: string) {
  const res = await fetch(`${getServer()}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
  const body = await res.json().catch(() => ({})) as { token?: string; error?: string }
  if (!res.ok || !body.token) throw new Error(body.error ?? `Erreur ${res.status}`)
  ls.set(LS.token, body.token)
  await syncNow()
}
export function logout() { ls.del(LS.token); setStatus({ state: 'login' }) }

async function countPending() {
  let n = await db.trash.where('_dirty').equals(1).count()
  for (const t of SYNC_TABLES) n += await db.table(t).where('_dirty').equals(1).count()
  return n
}

type Rec = Record<string, unknown> & { id: string | number; updatedAt: number; deleted?: boolean }
let running: Promise<void> | null = null
let again = false

export function syncNow(): Promise<void> {
  if (running) { again = true; return running }
  running = (async () => {
    try { do { again = false; await syncOnce() } while (again) } finally { running = null }
  })()
  return running
}

async function syncOnce() {
  const pending = await countPending()
  if (isFileVersion() && !getServer()) return setStatus({ state: 'noserver', pending })
  const token = ls.get(LS.token)
  if (!token) return setStatus({ state: 'login', pending })
  if (!navigator.onLine) return setStatus({ state: 'offline', pending })
  setStatus({ state: 'syncing', pending })

  // 1. Ce qui a changé sur cet appareil
  const changes: Partial<Record<SyncTable, Rec[]>> = {}
  const sent: { table: SyncTable; key: string | number; updatedAt: number }[] = []
  for (const t of SYNC_TABLES) {
    const rows = (await db.table(t).where('_dirty').equals(1).toArray()) as Record<string, unknown>[]
    const list: Rec[] = []
    for (const r of rows) {
      if (t === 'settings' && LOCAL_SETTINGS.has(r.key as string)) continue
      const id = (t === 'settings' ? r.key : r.id) as string | number
      const { _dirty: _d, ...clean } = r
      void _d
      list.push({ ...clean, id, updatedAt: r.updatedAt as number })
      sent.push({ table: t, key: id, updatedAt: r.updatedAt as number })
    }
    changes[t] = list
  }
  const trashed = await db.trash.where('_dirty').equals(1).toArray()
  for (const tr of trashed) (changes[tr.table] ??= []).push({ ...tr.record, id: tr.id, updatedAt: tr.deletedAt, deleted: true })

  // 2. Envoi + réception
  let res: Response
  try {
    res = await fetch(`${getServer()}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ since: Number(ls.get(LS.since)) || 0, changes }),
    })
  } catch {
    return setStatus({ state: navigator.onLine ? 'error' : 'offline', pending, message: 'Site injoignable.' })
  }
  if (res.status === 401) { ls.del(LS.token); return setStatus({ state: 'login', pending, message: 'Reconnectez-vous.' }) }
  const body = await res.json().catch(() => null) as { now: number; changes: Partial<Record<SyncTable, Rec[]>>; error?: string } | null
  if (!res.ok || !body) return setStatus({ state: 'error', pending, message: body?.error ?? `Erreur ${res.status}` })

  // 3. Marquer comme envoyé (sauf ce qui a été modifié entre-temps)
  for (const s of sent) {
    await db.table(s.table).where(s.table === 'settings' ? 'key' : 'id').equals(s.key)
      .modify((r: Record<string, unknown>) => { if (r.updatedAt === s.updatedAt) { r._dirty = 0; r._sync = 1 } })
  }
  for (const tr of trashed) await db.trash.where('key').equals(tr.key).modify((r) => { if (r.deletedAt === tr.deletedAt) r._dirty = 0 })

  // 4. Appliquer ce qui vient du site (le plus récent gagne)
  for (const t of SYNC_TABLES) {
    const incoming = body.changes[t] ?? []
    if (!incoming.length) continue
    const table = db.table(t)
    await db.transaction('rw', table, db.trash, async () => {
      for (const r of incoming) {
        const { _srv: _s, deleted, ...rec } = r as Rec & { _srv?: number }
        void _s
        const pk = t === 'settings' ? (rec.key as string) : rec.id
        if (t === 'settings' && LOCAL_SETTINGS.has(pk as string)) continue
        const local = await table.get(pk) as Rec | undefined
        if (local && (local.updatedAt ?? 0) > rec.updatedAt) continue // modification locale plus récente : elle partira au prochain envoi
        const tkey = `${t}|${pk}`
        if (deleted) {
          if (local) await table.delete(pk)
          const tr = await db.trash.get(tkey)
          if (!tr || tr.deletedAt < rec.updatedAt) await db.trash.put({ key: tkey, table: t, id: pk, record: rec, deletedAt: rec.updatedAt, _dirty: 0 })
        } else {
          const record = t === 'settings' ? (({ id: _i, ...x }) => { void _i; return x })(rec) : rec
          await table.put({ ...record, _dirty: 0, _sync: 1 })
          const tr = await db.trash.get(tkey)
          if (tr && tr.deletedAt <= rec.updatedAt) await db.trash.delete(tkey)
        }
      }
    })
  }
  ls.set(LS.since, String(body.now))
  ls.set('sonaltech.lastSync', String(Date.now()))
  const left = await countPending()
  setStatus({ state: left ? 'pending' : 'ok', pending: left, lastSync: Date.now(), message: '' })
  if (left) again = true
}

/* Déclencheurs : au démarrage, après chaque modification, au retour d'internet, et toutes les 30 s. */
let timer: number | undefined
export function startSync() {
  setLocalChangeListener(() => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void syncNow(), 1200)
    void countPending().then((pending) => setStatus({ pending, state: status.state === 'ok' ? 'pending' : status.state }))
  })
  window.addEventListener('online', () => void syncNow())
  window.addEventListener('offline', () => setStatus({ state: 'offline' }))
  window.setInterval(() => void syncNow(), 30_000)
  void syncNow()
}
