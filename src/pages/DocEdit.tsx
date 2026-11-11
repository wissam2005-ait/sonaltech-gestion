import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, docLabels, docTotals, getCompany, isQtyDoc, lineTotal, paidAmount, remaining, remove as removeRecord, round2, type Doc, type DocType, type Line } from '../lib/db'
import { createDoc, docRef, exportDocExcel } from '../lib/docs'
import { downloadDocPdf, openDocPdf } from '../lib/pdf'
import { money, parseNum, qtyFmt, todayIso } from '../lib/format'
import PrintedDoc from '../components/PrintedDoc'
import { Field, Modal, PageHeader, confirmDelete } from '../components/ui'
import { Icon } from '../components/icons'
import { statusLabel } from './DocsList'
import { ClientForm } from './Clients'

const units = ['U', 'ML', 'M²', 'M³', 'ENS', 'FF', 'KG', 'H', 'J']
const payModes = ['Par chèque', 'Par virement', 'En espèces', 'Par CCP', 'À la livraison']

export default function DocEdit() {
  const { type, id } = useParams() as { type: DocType; id: string }
  const navigate = useNavigate()
  const stored = useLiveQuery(() => db.docs.get(Number(id)), [id])
  const company = useLiveQuery(getCompany, [])
  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [])
  const chantiers = useLiveQuery(() => db.chantiers.orderBy('name').toArray(), [])
  const articles = useLiveQuery(() => db.articles.orderBy('designation').toArray(), [])
  const [doc, setDoc] = useState<Doc | null>(null)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [saved, setSaved] = useState(true)
  const [newClient, setNewClient] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const timer = useRef<number>()

  useEffect(() => { if (stored && (!doc || doc.id !== stored.id)) setDoc(stored) }, [stored, doc])

  // Enregistrement automatique
  function update(patch: Partial<Doc>) {
    setDoc((d) => {
      if (!d) return d
      const next = { ...d, ...patch }
      setSaved(false)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(async () => { await db.docs.put(next); setSaved(true) }, 350)
      return next
    })
  }
  const setLine = (i: number, patch: Partial<Line>) => update({ lines: doc!.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) })
  function pickDesignation(i: number, value: string) {
    const a = articles?.find((x) => x.designation.toLowerCase() === value.trim().toLowerCase())
    setLine(i, a ? { designation: a.designation, unit: a.unit, price: a.price } : { designation: value })
  }
  const moveLine = (i: number, d: number) => {
    const lines = [...doc!.lines]; const j = i + d
    if (j < 0 || j >= lines.length) return
    ;[lines[i], lines[j]] = [lines[j], lines[i]]; update({ lines })
  }

  if (stored === null || (stored === undefined && doc === null)) {
    return stored === null ? <p>Document introuvable.</p> : null
  }
  if (!doc || !company) return null
  const t = docTotals(doc)
  const client = clients?.find((c) => c.id === doc.clientId)
  const chantier = chantiers?.find((c) => c.id === doc.chantierId)
  const paid = paidAmount(doc)
  const billable = doc.type === 'facture' || doc.type === 'bon'
  const qtyDoc = isQtyDoc(doc.type)

  async function convert(to: DocType) {
    await db.docs.put(doc!)
    const newId = await createDoc(to, doc!)
    if (doc!.type === 'devis') await db.docs.update(doc!.id!, { status: 'accepte' })
    navigate(`/documents/${to}/${newId}`)
  }
  async function duplicate() { await db.docs.put(doc!); navigate(`/documents/${doc!.type}/${await createDoc(doc!.type, { ...doc!, id: undefined })}`) }
  async function remove() {
    if (!confirmDelete(`${docLabels[doc!.type].one.toLowerCase()} ${docRef(doc!)}`)) return
    window.clearTimeout(timer.current)
    await db.docs.put(doc!); await removeRecord('docs', [doc!.id!]); navigate(`/documents/${doc!.type}`)
  }
  async function print() { await db.docs.put(doc!); setTab('preview'); setTimeout(() => window.print(), 150) }

  return (
    <>
      <PageHeader back={{ to: `/documents/${type}`, label: docLabels[type].many }}
        title={<>{docLabels[type].one} {docRef(doc)}</>}
        subtitle={<span className="flex items-center gap-2">{saved ? <><Icon name="check" size={14} /> Enregistré sur cet ordinateur</> : 'Enregistrement…'}</span>}
        actions={<>
          <button className="btn-volt" onClick={async () => { await db.docs.put(doc); await downloadDocPdf(doc) }}><Icon name="download" size={16} /> PDF</button>
          <button className="btn-ghost" onClick={async () => { await db.docs.put(doc); await openDocPdf(doc) }}><Icon name="external" size={16} /> Ouvrir le PDF</button>
          <button className="btn-ghost" onClick={print}><Icon name="print" size={16} /> Imprimer</button>
          <button className="btn-ghost" onClick={() => exportDocExcel(doc)}><Icon name="sheet" size={16} /> Excel</button>
          <button className="btn-ghost" onClick={duplicate}><Icon name="plus" size={16} /> Dupliquer</button>
          {doc.type === 'devis' && <>
            <button className="btn-primary" onClick={() => convert('facture')}>→ Facture</button>
            <button className="btn-ghost" onClick={() => convert('bon')}>→ Bon pour</button>
            <button className="btn-ghost" onClick={() => convert('attachement')}>→ Attachement</button>
          </>}
          {doc.type === 'attachement' && <button className="btn-primary" onClick={() => convert('facture')}>→ Facture</button>}
          <button className="btn-danger" onClick={remove}><Icon name="trash" size={16} /></button>
        </>} />

      <div className="no-print mb-5 inline-flex rounded-lg border border-line bg-white p-1">
        {(['edit', 'preview'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${tab === k ? 'bg-ink text-white' : 'text-ink/70'}`}>{k === 'edit' ? 'Modifier' : 'Aperçu avant impression'}</button>
        ))}
      </div>

      {tab === 'edit' && (
        <div className="no-print space-y-6">
          <section className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Numéro"><div className="flex items-center gap-2"><input className="input" type="number" min={1} value={doc.number} onChange={(e) => update({ number: Math.max(1, parseInt(e.target.value) || 1) })} /><span className="text-ink/60">/{doc.year}</span></div></Field>
            <Field label="Date"><input className="input" type="date" value={doc.date} onChange={(e) => update({ date: e.target.value, year: Number(e.target.value.slice(0, 4)) || doc.year })} /></Field>
            <Field label="Client">
              <div className="flex gap-2">
                <select className="input" value={doc.clientId ?? ''} onChange={(e) => update({ clientId: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">— Choisir —</option>
                  {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn-ghost px-2.5" title="Nouveau client" onClick={() => setNewClient(true)}><Icon name="plus" size={16} /></button>
              </div>
            </Field>
            <Field label="Chantier">
              <select className="input" value={doc.chantierId ?? ''} onChange={(e) => update({ chantierId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">— Aucun —</option>
                {chantiers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Objet (facultatif)" className="sm:col-span-2"><input className="input" value={doc.object} onChange={(e) => update({ object: e.target.value })} placeholder="ex. Travaux d'électricité — villa R+1" /></Field>
            {!qtyDoc && <Field label="Mode de règlement">
              <input className="input" list="paymodes" value={doc.paymentMode} onChange={(e) => update({ paymentMode: e.target.value })} />
              <datalist id="paymodes">{payModes.map((m) => <option key={m} value={m} />)}</datalist>
            </Field>}
            <div>
              <Field label="État">
                <select className="input" value={doc.status} onChange={(e) => update({ status: e.target.value as Doc['status'] })}>
                  {Object.entries(statusLabel).filter(([k]) => billable ? k !== 'accepte' && k !== 'refuse' : k !== 'paye').map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
            </div>
          </section>

          <section className="card overflow-x-auto">
            <table className="tbl min-w-[820px]">
              <thead>{qtyDoc
                ? <tr><th className="w-8">#</th><th>Description</th><th className="w-24">U</th><th className="w-32 !text-right">Qté contrat</th><th className="w-32 !text-right">Qté réalisée</th><th className="w-36 !text-right">Qté reste à réaliser</th><th className="w-24" /></tr>
                : <tr><th className="w-8">#</th><th>Description</th><th className="w-24">U</th><th className="w-32 !text-right">PU HT</th><th className="w-28 !text-right">Quantité</th><th className="w-36 !text-right">Montant HT</th><th className="w-24" /></tr>}</thead>
              <tbody>
                {doc.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="text-ink/40">{i + 1}</td>
                    <td><input className="input font-bold" list="catalogue" value={l.designation} onChange={(e) => pickDesignation(i, e.target.value)} placeholder="Tapez ou choisissez dans le catalogue…" /></td>
                    <td><input className="input" list="units" value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value.toUpperCase() })} /></td>
                    {qtyDoc ? <>
                      <td><input className="input text-right" inputMode="decimal" value={l.contractQty || ''} onChange={(e) => setLine(i, { contractQty: parseNum(e.target.value) })} /></td>
                      <td><input className="input text-right" inputMode="decimal" value={l.qty || ''} onChange={(e) => setLine(i, { qty: parseNum(e.target.value) })} /></td>
                      <td className={`num font-semibold ${remaining(l) < 0 ? 'text-[#c2332b]' : ''}`}>{qtyFmt(remaining(l))}</td>
                    </> : <>
                      <td><input className="input text-right" inputMode="decimal" value={l.price || ''} onChange={(e) => setLine(i, { price: parseNum(e.target.value) })} /></td>
                      <td><input className="input text-right" inputMode="decimal" value={l.qty || ''} onChange={(e) => setLine(i, { qty: parseNum(e.target.value) })} /></td>
                      <td className="num font-semibold">{money(lineTotal(l))}</td>
                    </>}
                    <td>
                      <div className="flex justify-end gap-0.5 text-ink/50">
                        <button title="Monter" onClick={() => moveLine(i, -1)} className="rounded p-1 hover:bg-panel hover:text-ink"><Icon name="up" size={15} /></button>
                        <button title="Descendre" onClick={() => moveLine(i, 1)} className="rounded p-1 hover:bg-panel hover:text-ink"><Icon name="down" size={15} /></button>
                        <button title="Supprimer la ligne" onClick={() => update({ lines: doc.lines.filter((_, k) => k !== i) })} className="rounded p-1 hover:bg-red-50 hover:text-red-700"><Icon name="trash" size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="catalogue">{articles?.map((a) => <option key={a.id} value={a.designation}>{a.unit} · {money(a.price)} DA</option>)}</datalist>
            <datalist id="units">{units.map((u) => <option key={u} value={u} />)}</datalist>
            <div className="flex flex-wrap items-start justify-between gap-6 p-4">
              <button className="btn-ghost" onClick={() => update({ lines: [...doc.lines, qtyDoc ? { designation: '', unit: 'U', price: 0, qty: 0, contractQty: 0 } : { designation: '', unit: 'U', price: 0, qty: 1 }] })}><Icon name="plus" size={16} /> Ajouter une ligne</button>
              {qtyDoc ? <p className="max-w-md text-sm text-ink/60">Qté reste à réaliser = quantité du contrat − quantité réalisée. En rouge si la quantité réalisée dépasse le contrat. « → Facture » facture les quantités réalisées.</p> : <dl className="min-w-[260px] space-y-1 text-sm">
                <div className="flex justify-between gap-6 text-lg font-bold"><dt>{doc.type === 'facture' ? 'Total TTC' : 'Total'}</dt><dd className="num">{money(t.ttc)} DA</dd></div>
              </dl>}
            </div>
          </section>

          {billable && (
            <section className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Paiements</h2>
                  <p className="text-sm text-ink/60">Encaissé {money(paid)} DA · reste à payer <strong>{money(Math.max(0, t.ttc - paid))} DA</strong></p>
                </div>
                <button className="btn-primary" onClick={() => setPayOpen(true)}><Icon name="plus" size={16} /> Enregistrer un paiement</button>
              </div>
              {doc.payments.length > 0 && (
                <table className="tbl mt-4">
                  <thead><tr><th>Date</th><th>Moyen</th><th className="!text-right">Montant</th><th /></tr></thead>
                  <tbody>{doc.payments.map((p, i) => (
                    <tr key={i}><td>{p.date.split('-').reverse().join('/')}</td><td>{p.mode}</td><td className="num">{money(p.amount)} DA</td>
                      <td className="text-right"><button className="text-ink/40 hover:text-red-700" onClick={() => { const payments = doc.payments.filter((_, k) => k !== i); update({ payments, status: paidAmountOf(payments) >= t.ttc && t.ttc > 0 ? 'paye' : doc.status === 'paye' ? 'envoye' : doc.status }) }}><Icon name="trash" size={15} /></button></td></tr>
                  ))}</tbody>
                </table>
              )}
            </section>
          )}
        </div>
      )}

      <div className={`${tab === 'preview' ? '' : 'hidden print:block'} overflow-x-auto rounded-xl bg-white shadow-lift print:shadow-none`}>
        <PrintedDoc doc={doc} company={company} client={client} chantierName={chantier?.name} />
      </div>

      <Modal open={newClient} title="Nouveau client" onClose={() => setNewClient(false)}>
        <ClientForm onSaved={(cid) => { update({ clientId: cid }); setNewClient(false) }} />
      </Modal>
      <PaymentModal open={payOpen} rest={Math.max(0, round2(t.ttc - paid))} onClose={() => setPayOpen(false)}
        onAdd={(p) => { const payments = [...doc.payments, p]; update({ payments, status: paidAmountOf(payments) >= t.ttc ? 'paye' : doc.status === 'brouillon' ? 'envoye' : doc.status }); setPayOpen(false) }} />
    </>
  )
}

const paidAmountOf = (ps: Doc['payments']) => round2(ps.reduce((s, p) => s + p.amount, 0))

function PaymentModal({ open, rest, onClose, onAdd }: { open: boolean; rest: number; onClose: () => void; onAdd: (p: Doc['payments'][number]) => void }) {
  const [form, setForm] = useState({ date: todayIso(), amount: '', mode: 'Chèque' })
  useEffect(() => { if (open) setForm({ date: todayIso(), amount: String(rest), mode: 'Chèque' }) }, [open, rest])
  return (
    <Modal open={open} title="Enregistrer un paiement" onClose={onClose}>
      <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); const amount = parseNum(form.amount); if (amount > 0) onAdd({ date: form.date, amount, mode: form.mode }) }}>
        <Field label="Date"><input className="input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label="Montant (DA)"><input className="input" inputMode="decimal" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
        <Field label="Moyen"><select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>{['Chèque', 'Virement', 'Espèces', 'CCP'].map((m) => <option key={m}>{m}</option>)}</select></Field>
        <div className="sm:col-span-3"><button className="btn-primary">Enregistrer</button></div>
      </form>
    </Modal>
  )
}
