import pg from 'pg'
import type { Store } from './core.js'

/**
 * Stockage PostgreSQL (Neon) pour l'hébergement Vercel : une table clé → données JSON,
 * avec un numéro de version pour que deux appareils ne s'écrasent jamais.
 */
let pool: pg.Pool | null = null
let ready: Promise<void> | null = null

function db() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
  if (!url) throw new Error('DATABASE_URL manquant : connectez une base Neon au projet.')
  pool ??= new pg.Pool({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
    max: 3,
  })
  ready ??= pool.query(`create table if not exists sonaltech_kv (
      key text primary key,
      data jsonb not null,
      version bigint not null default 1,
      updated_at timestamptz not null default now())`).then(() => undefined)
  return { pool, ready }
}

export const pgStore: Store = {
  async get(key) {
    const { pool, ready } = db(); await ready
    const r = await pool.query('select data, version from sonaltech_kv where key = $1', [key])
    return r.rowCount ? { data: r.rows[0].data, etag: String(r.rows[0].version) } : null
  },
  async setIfUnchanged(key, data, etag) {
    const { pool, ready } = db(); await ready
    const r = etag
      ? await pool.query('update sonaltech_kv set data = $2, version = version + 1, updated_at = now() where key = $1 and version = $3', [key, JSON.stringify(data), Number(etag)])
      : await pool.query('insert into sonaltech_kv (key, data) values ($1, $2) on conflict (key) do nothing', [key, JSON.stringify(data)])
    return (r.rowCount ?? 0) > 0
  },
  async put(key, data) {
    const { pool, ready } = db(); await ready
    await pool.query(`insert into sonaltech_kv (key, data) values ($1, $2)
      on conflict (key) do update set data = excluded.data, version = sonaltech_kv.version + 1, updated_at = now()`, [key, JSON.stringify(data)])
  },
}
