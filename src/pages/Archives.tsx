import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, docLabels, type DocType } from '../lib/db'
import { docAmount, docRef } from '../lib/docs'
import { downloadDocPdf, openDocPdf, zipPdfs } from '../lib/pdf'
import { dateFr, monthLabel } from '../lib/format'
import { Empty, PageHeader } from '../components/ui'
import { Icon } from '../components/icons'

/** Tous les documents en PDF, à ouvrir ou télécharger à tout moment (un par un ou tous ensemble). */
export default function Archives() {
  const [type, setType] = useState<'all' | DocType>('all')
  const [period, setPeriod] = useState<string>(String(new Date().getFullYear()))
  const [progress, setProgress] = useState<string | null>(null)
  const docs = useLiveQuery(() => db.docs.toArray(), [])
  const clients = useLiveQuery(() => db.clients.toArray(), [])
  const periods = useMemo(() => {
    const ys = [...new Set((docs ?? []).map((d) => String(d.year)))].sort().reverse()
    const ms = [...new Set((docs ?? []).map((d) => d.date.slice(0, 7)))].sort().reverse()
    return { ys: ys.length ? ys : [String(new Date().getFullYear())], ms }
  }, [docs])
  const shown = (docs ?? [])
    .filter((d) => type === 'all' || d.type === type)
    .filter((d) => period === 'all' || (period.length === 4 ? String(d.year) === period : d.date.startsWith(period)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number)
  const label = period === 'all' ? 'tout' : period.length === 4 ? period : monthLabel(period)

  async function zipAll() {
    setProgress(`0 / ${shown.length}`)
    try { await zipPdfs(shown, `Sonaltech Électrique - Documents ${type === 'all' ? '' : docLabels[type].many + ' '}${label}.zip`, (n) => setProgress(`${n} / ${shown.length}`)) } finally { setProgress(null) }
  }

  return (
    <>
      <PageHeader title="Archives PDF" subtitle="Toutes les factures, devis, bons pour et attachements en PDF. Ils sont enregistrés sur le site : vous les retrouvez à tout moment, sur tous vos appareils."
        actions={<button className="btn-volt" disabled={!shown.length || !!progress} onClick={zipAll}><Icon name="download" size={16} /> {progress ? `Préparation… ${progress}` : `Tout télécharger (${shown.length} PDF)`}</button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="all">Tous les documents</option>
          {(Object.keys(docLabels) as DocType[]).map((t) => <option key={t} value={t}>{docLabels[t].many}</option>)}
        </select>
        <select className="input w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="all">Toutes les périodes</option>
          <optgroup label="Années">{periods.ys.map((y) => <option key={y} value={y}>{y}</option>)}</optgroup>
          {periods.ms.length > 0 && <optgroup label="Mois">{periods.ms.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</optgroup>}
        </select>
      </div>
      {docs && shown.length === 0 ? <Empty icon="doc" title="Aucun document sur cette période" /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[680px]">
          <thead><tr><th>Document</th><th>Date</th><th>Client</th><th className="!text-right">Total TTC</th><th /></tr></thead>
          <tbody>{shown.map((d) => (
            <tr key={d.id}>
              <td className="font-semibold"><Link to={`/documents/${d.type}/${d.id}`}>{docLabels[d.type].one} {docRef(d)}</Link></td>
              <td>{dateFr(d.date)}</td>
              <td>{clients?.find((c) => c.id === d.clientId)?.name ?? '—'}</td>
              <td className="num">{docAmount(d)}</td>
              <td className="whitespace-nowrap text-right">
                <button className="btn-ghost px-2.5 py-1.5" onClick={() => openDocPdf(d)}><Icon name="external" size={15} /> Ouvrir</button>{' '}
                <button className="btn-primary px-2.5 py-1.5" onClick={() => downloadDocPdf(d)}><Icon name="download" size={15} /> PDF</button>
              </td>
            </tr>
          ))}</tbody></table></div>
      )}
    </>
  )
}
