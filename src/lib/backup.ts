import { db } from './db'
import { downloadBlob } from './xlsx'
import { todayIso } from './format'

const TABLES = ['clients', 'chantiers', 'articles', 'docs', 'employees', 'pointages', 'frais', 'settings'] as const

/** Nombre de jours depuis la dernière sauvegarde (null = jamais). */
export async function backupAge(): Promise<number | null> {
  const last = (await db.settings.get('last-backup'))?.value as string | undefined
  if (!last) return null
  return Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000)
}

export async function exportBackup() {
  const data: Record<string, unknown[]> = {}
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  data.settings = (data.settings as { key: string }[]).filter((s) => s.key !== 'last-backup')
  const file = { app: 'sonaltech-gestion', version: 1, exportedAt: new Date().toISOString(), data }
  downloadBlob(new Blob([JSON.stringify(file)], { type: 'application/json' }), `sauvegarde-sonaltech-${todayIso()}.json`)
  await db.settings.put({ key: 'last-backup', value: new Date().toISOString() })
}

/** Remplace TOUTES les données par celles du fichier. */
export async function importBackup(file: File) {
  const parsed = JSON.parse(await file.text()) as { app?: string; data?: Record<string, unknown[]> }
  if (parsed.app !== 'sonaltech-gestion' || !parsed.data) throw new Error('Ce fichier n’est pas une sauvegarde Sonaltech.')
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      const rows = parsed.data![t] ?? []
      if (rows.length) await db.table(t).bulkAdd(rows)
    }
  })
  await db.settings.put({ key: 'last-backup', value: new Date().toISOString() })
}

/** Demande au navigateur de ne jamais effacer ces données automatiquement. */
export async function askPersistentStorage() {
  try { return (await navigator.storage?.persist?.()) ?? false } catch { return false }
}
export async function isPersistent() {
  try { return (await navigator.storage?.persisted?.()) ?? false } catch { return false }
}
