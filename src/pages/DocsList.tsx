import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, docLabels, docTotals, paidAmount, type Doc, type DocType } from '../lib/db'
import { createDoc, docRef } from '../lib/docs'
import { dateFr, money } from '../lib/format'
import { Badge, Empty, PageHeader } from '../components/ui'
import { Icon } from '../components/icons'

export const statusLabel: Record<Doc['status'], [string, 'neutral' | 'blue' | 'green' | 'red' | 'amber']> = {
  brouillon: ['Brouillon', 'neutral'], envoye: ['Envoyé', 'blue'], accepte: ['Accepté', 'green'], refuse: ['Refusé', 'red'], paye: ['Payé', 'green'],
}

export default function DocsList() {
  const type = useParams().type as DocType
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [year, setYear] = useState<number | 'all'>(new Date().getFullYear())
  const docs = useLiveQuery(() => db.docs.where('type').equals(type).reverse().sortBy('date'), [type])
  const clients = useLiveQuery(() => db.clients.toArray(), [])
  const chantiers = useLiveQuery(() => db.chantiers.toArray(), [])
  const clientName = (id?: number) => clients?.find((c) => c.id === id)?.name ?? '—'
  const label = docLabels[type]

  const years = useMemo(() => [...new Set((docs ?? []).map((d) => d.year))].sort((a, b) => b - a), [docs])
  const shown = (docs ?? [])
    .filter((d) => year === 'all' || d.year === year)
    .filter((d) => !q || `${docRef(d)} ${clientName(d.clientId)} ${d.object}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.year - a.year || b.number - a.number)
  const total = shown.reduce((s, d) => s + docTotals(d).ttc, 0)
  const unpaid = type === 'facture' || type === 'bon' ? shown.reduce((s, d) => s + Math.max(0, docTotals(d).ttc - paidAmount(d)), 0) : 0

  async function onNew() { navigate(`/documents/${type}/${await createDoc(type)}`) }

  if (!label) return null
  return (
    <>
      <PageHeader title={label.many} subtitle={`${shown.length} document${shown.length > 1 ? 's' : ''} · total ${money(total)} DA${unpaid ? ` · reste à encaisser ${money(unpaid)} DA` : ''}`}
        actions={<button className="btn-volt" onClick={onNew}><Icon name="plus" size={16} /> Nouveau {label.one.toLowerCase()}</button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Rechercher (n°, client, objet)…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={year} onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">Toutes les années</option>
          {[...new Set([new Date().getFullYear(), ...years])].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {docs && shown.length === 0 ? (
        <Empty icon="invoice" title={`Aucun ${label.one.toLowerCase()}`} text="Créez le premier : il sera numéroté automatiquement." action={<button className="btn-primary" onClick={onNew}>Nouveau {label.one.toLowerCase()}</button>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl min-w-[720px]">
            <thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Objet / chantier</th><th className="!text-right">Total TTC</th><th>État</th></tr></thead>
            <tbody>
              {shown.map((d) => {
                const [s, tone] = statusLabel[d.status]
                const rest = docTotals(d).ttc - paidAmount(d)
                return (
                  <tr key={d.id} className="cursor-pointer" onClick={() => navigate(`/documents/${type}/${d.id}`)}>
                    <td className="font-semibold"><Link to={`/documents/${type}/${d.id}`} onClick={(e) => e.stopPropagation()}>{docRef(d)}</Link></td>
                    <td>{dateFr(d.date)}</td>
                    <td>{clientName(d.clientId)}</td>
                    <td className="max-w-[260px] truncate text-ink/70">{d.object || chantiers?.find((c) => c.id === d.chantierId)?.name || ''}</td>
                    <td className="num font-semibold">{money(docTotals(d).ttc)}</td>
                    <td><Badge tone={tone}>{s}</Badge>{(type === 'facture' || type === 'bon') && d.status !== 'paye' && paidAmount(d) > 0 && <span className="ml-2 text-xs text-ink/60">reste {money(rest)}</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
