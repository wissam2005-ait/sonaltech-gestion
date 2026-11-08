import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, docLabels, docTotals, presenceLabels, remove, type DocType } from '../lib/db'
import { createDoc, docRef } from '../lib/docs'
import { dateFr, money } from '../lib/format'
import { Badge, Modal, PageHeader, Stat, confirmDelete } from '../components/ui'
import { Icon } from '../components/icons'
import { ChantierForm, chantierStatus } from './Chantiers'

export default function ChantierDetail() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [edit, setEdit] = useState(false)
  const c = useLiveQuery(() => db.chantiers.get(id), [id])
  const client = useLiveQuery(async () => (c?.clientId ? db.clients.get(c.clientId) : undefined), [c?.clientId])
  const docs = useLiveQuery(() => db.docs.where('chantierId').equals(id).toArray(), [id])
  const frais = useLiveQuery(() => db.frais.where('chantierId').equals(id).toArray(), [id])
  const points = useLiveQuery(() => db.pointages.where('chantierId').equals(id).toArray(), [id])
  const employees = useLiveQuery(() => db.employees.toArray(), [])
  if (c === undefined) return null
  if (c === null) return <p>Chantier introuvable.</p>

  // Bénéfice = facturé HT (factures + bons) − frais du chantier − main-d'œuvre (jours pointés × tarif journalier)
  const billed = (docs ?? []).filter((d) => d.type === 'facture' || d.type === 'bon').reduce((s, d) => s + docTotals(d).ht, 0)
  const quoted = (docs ?? []).filter((d) => d.type === 'devis').reduce((s, d) => s + docTotals(d).ht, 0)
  const costFrais = (frais ?? []).filter((f) => f.kind !== 'avance').reduce((s, f) => s + f.amount, 0)
  const labour = (points ?? []).reduce((s, p) => s + presenceLabels[p.status].value * (employees?.find((e) => e.id === p.employeeId)?.dailyRate ?? 0), 0)
  const days = (points ?? []).reduce((s, p) => s + presenceLabels[p.status].value, 0)
  const profit = billed - costFrais - labour

  async function newDoc(type: DocType) { navigate(`/documents/${type}/${await createDoc(type, { chantierId: id, clientId: c!.clientId, object: c!.name })}`) }

  return (
    <>
      <PageHeader back={{ to: '/chantiers', label: 'Chantiers' }} title={c.name}
        subtitle={<span className="flex flex-wrap items-center gap-2"><Badge tone={chantierStatus[c.status][1]}>{chantierStatus[c.status][0]}</Badge>{client?.name ?? 'Sans client'} · {c.address}</span>}
        actions={<>
          <button className="btn-ghost" onClick={() => newDoc('devis')}>+ Devis</button>
          <button className="btn-ghost" onClick={() => newDoc('attachement')}>+ Attachement</button>
          <button className="btn-primary" onClick={() => newDoc('facture')}>+ Facture</button>
          <button className="btn-ghost" onClick={() => setEdit(true)}><Icon name="edit" size={16} /></button>
          <button className="btn-danger" onClick={async () => { if (confirmDelete(`le chantier ${c.name} (les documents et frais sont conservés)`)) { await remove('chantiers', [id]); navigate('/chantiers') } }}><Icon name="trash" size={16} /></button>
        </>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Devis (HT)" value={money(quoted)} />
        <Stat label="Facturé (HT)" value={money(billed)} />
        <Stat label="Frais" value={money(costFrais)} hint="Hors avances aux employés" />
        <Stat label="Main-d'œuvre" value={money(labour)} hint={`${days} jour${days > 1 ? 's' : ''} pointé${days > 1 ? 's' : ''}`} />
        <Stat label="Bénéfice" value={money(profit)} tone={profit >= 0 ? 'green' : 'red'} hint="Facturé − frais − main-d'œuvre" />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-2xl font-bold">Documents</h2>
        {docs?.length ? (
          <div className="card overflow-x-auto"><table className="tbl min-w-[560px]">
            <thead><tr><th>Type</th><th>N°</th><th>Date</th><th className="!text-right">Total TTC</th></tr></thead>
            <tbody>{[...docs].sort((a, b) => b.date.localeCompare(a.date)).map((d) => (
              <tr key={d.id}><td>{docLabels[d.type].one}</td><td className="font-semibold"><Link to={`/documents/${d.type}/${d.id}`}>{docRef(d)}</Link></td><td>{dateFr(d.date)}</td><td className="num">{money(docTotals(d).ttc)}</td></tr>
            ))}</tbody></table></div>
        ) : <p className="text-ink/60">Aucun document pour ce chantier.</p>}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-bold">Frais du chantier</h2><Link to={`/frais?chantier=${id}`} className="text-sm font-semibold text-navy hover:underline">Gérer les frais →</Link></div>
        {frais?.length ? (
          <div className="card overflow-x-auto"><table className="tbl min-w-[520px]">
            <thead><tr><th>Date</th><th>Catégorie</th><th>Note</th><th className="!text-right">Montant</th></tr></thead>
            <tbody>{[...frais].sort((a, b) => b.date.localeCompare(a.date)).map((f) => (
              <tr key={f.id}><td>{dateFr(f.date)}</td><td>{f.category}</td><td className="text-ink/70">{f.note}</td><td className="num">{money(f.amount)}</td></tr>
            ))}</tbody></table></div>
        ) : <p className="text-ink/60">Aucun frais saisi.</p>}
      </section>

      {c.notes && <section className="mt-8"><h2 className="mb-2 text-2xl font-bold">Notes</h2><p className="card whitespace-pre-wrap p-5">{c.notes}</p></section>}

      <Modal open={edit} title="Modifier le chantier" onClose={() => setEdit(false)} wide>
        <ChantierForm initial={c} onSaved={() => setEdit(false)} />
      </Modal>
    </>
  )
}
