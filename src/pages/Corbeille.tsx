import { useLiveQuery } from 'dexie-react-hooks'
import { db, docLabels, docTotals, restore, type Doc, type SyncTable, type TrashItem } from '../lib/db'
import { docRef } from '../lib/docs'
import { money } from '../lib/format'
import { Empty, PageHeader } from '../components/ui'
import { Icon } from '../components/icons'

const tableLabel: Record<SyncTable, string> = { docs: 'Document', clients: 'Client', chantiers: 'Chantier', articles: 'Article', employees: 'Employé', pointages: 'Pointage', frais: 'Frais', settings: 'Réglage' }

function describe(t: TrashItem) {
  const r = t.record as Record<string, unknown>
  if (t.table === 'docs') { const d = r as unknown as Doc; return `${docLabels[d.type]?.one ?? 'Document'} ${docRef(d)} — ${money(docTotals(d).ttc)} DA` }
  if (t.table === 'frais') return `${r.category} — ${money(r.amount as number)} DA (${String(r.date).split('-').reverse().join('/')})`
  if (t.table === 'pointages') return `${String(r.date).split('-').reverse().join('/')} — ${r.status}`
  return String(r.name ?? r.designation ?? t.id)
}

export default function Corbeille() {
  const items = useLiveQuery(() => db.trash.orderBy('deletedAt').reverse().filter((t) => t.table !== 'pointages').toArray(), [])
  return (
    <>
      <PageHeader title="Corbeille" subtitle="Rien n'est jamais perdu : tout ce qui est supprimé reste enregistré sur le site et peut être restauré ici." />
      {items && items.length === 0 ? <Empty icon="trash" title="La corbeille est vide" /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[560px]">
          <thead><tr><th>Type</th><th>Élément</th><th>Supprimé le</th><th /></tr></thead>
          <tbody>{items?.map((t) => (
            <tr key={t.key}><td>{tableLabel[t.table]}</td><td className="font-semibold">{describe(t)}</td>
              <td>{new Date(t.deletedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td className="text-right"><button className="btn-ghost" onClick={() => restore(t)}><Icon name="back" size={16} /> Restaurer</button></td></tr>
          ))}</tbody></table></div>
      )}
    </>
  )
}
