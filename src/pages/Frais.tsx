import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, fraisCategories, remove, type Frais, type FraisKind } from '../lib/db'
import { currentMonth, dateFr, money, monthLabel, parseNum, shiftMonth, todayIso } from '../lib/format'
import { downloadXlsx, ST, type Sheet } from '../lib/xlsx'
import { tablePdf } from '../lib/pdf'
import { getCompany } from '../lib/db'
import { Empty, Field, Modal, PageHeader, confirmDelete } from '../components/ui'
import { Icon } from '../components/icons'

const newFrais = (kind: FraisKind = 'chantier', chantierId?: number): Frais => ({ date: todayIso(), kind, category: fraisCategories[kind].items[0], amount: 0, chantierId, payMode: 'Espèces', note: '' })

export default function FraisPage() {
  const [params] = useSearchParams()
  const chantierFilter = params.get('chantier') ? Number(params.get('chantier')) : undefined
  const [month, setMonth] = useState<string>(chantierFilter ? 'all' : currentMonth())
  const [kind, setKind] = useState<'all' | FraisKind>('all')
  const [edit, setEdit] = useState<Frais | null>(null)
  const frais = useLiveQuery(() => db.frais.orderBy('date').reverse().toArray(), [])
  const chantiers = useLiveQuery(() => db.chantiers.toArray(), [])
  const employees = useLiveQuery(() => db.employees.toArray(), [])
  const shown = (frais ?? []).filter((f) => (month === 'all' || f.date.startsWith(month)) && (kind === 'all' || f.kind === kind) && (!chantierFilter || f.chantierId === chantierFilter))
  const total = shown.reduce((s, f) => s + f.amount, 0)
  const byCat = Object.entries(shown.reduce<Record<string, number>>((m, f) => { const k = `${fraisCategories[f.kind].label} — ${f.category}`; m[k] = (m[k] ?? 0) + f.amount; return m }, {})).sort((a, b) => b[1] - a[1])
  const chName = (id?: number) => chantiers?.find((c) => c.id === id)?.name ?? ''
  const empName = (id?: number) => employees?.find((e) => e.id === id)?.name ?? ''

  function exportExcel() {
    const rows: Sheet['rows'] = [[{ v: `Frais — ${month === 'all' ? 'toutes périodes' : monthLabel(month)}`, s: ST.bold }], [],
      ['Date', 'Type', 'Catégorie', 'Chantier', 'Employé', 'Paiement', 'Note', 'Montant (DA)'].map((v) => ({ v, s: ST.head }))]
    const first = rows.length
    shown.forEach((f) => rows.push([{ v: dateFr(f.date), s: ST.cell }, { v: fraisCategories[f.kind].label, s: ST.cell }, { v: f.category, s: ST.cell }, { v: chName(f.chantierId), s: ST.cell }, { v: empName(f.employeeId), s: ST.cell }, { v: f.payMode, s: ST.cell }, { v: f.note, s: ST.cell }, { v: f.amount, s: ST.cellNum }]))
    rows.push([null, null, null, null, null, null, { v: 'TOTAL', s: ST.bold }, { v: total, f: `SUM(H${first + 1}:H${rows.length})`, s: ST.numBold }])
    downloadXlsx(`Frais ${month}`, [{ name: 'Frais', rows, widths: [11, 20, 22, 22, 18, 12, 30, 14] }])
  }

  async function exportPdf() {
    tablePdf({
      company: await getCompany(), fileName: `Frais ${month === 'all' ? 'toutes periodes' : month}.pdf`,
      title: `État des frais — ${month === 'all' ? 'toutes périodes' : monthLabel(month)}`, subtitle: chantierFilter ? `Chantier : ${chName(chantierFilter)}` : undefined,
      head: ['Date', 'Type', 'Catégorie', 'Chantier / employé', 'Paiement', 'Note', 'Montant (DA)'],
      body: shown.map((f) => [dateFr(f.date), fraisCategories[f.kind].label, f.category, [chName(f.chantierId), empName(f.employeeId)].filter(Boolean).join(' · '), f.payMode, f.note, money(f.amount)]),
      foot: ['', '', '', '', '', 'TOTAL', money(total)],
      align: ['left', 'left', 'left', 'left', 'left', 'left', 'right'],
    })
  }

  return (
    <>
      <PageHeader title="Frais" subtitle={chantierFilter ? `Chantier : ${chName(chantierFilter)}` : 'Frais de chantier, frais généraux et avances aux employés.'}
        actions={<>
          <button className="btn-ghost" onClick={exportPdf}><Icon name="download" size={16} /> PDF</button>
          <button className="btn-ghost" onClick={exportExcel}><Icon name="sheet" size={16} /> Excel</button>
          <button className="btn-volt" onClick={() => setEdit(newFrais(chantierFilter ? 'chantier' : 'chantier', chantierFilter))}><Icon name="plus" size={16} /> Nouveau frais</button>
        </>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-line bg-white p-1">
          <button className="rounded p-1.5 hover:bg-panel disabled:opacity-30" disabled={month === 'all'} onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="back" size={18} /></button>
          <span className="min-w-[150px] text-center font-semibold capitalize">{month === 'all' ? 'Toutes périodes' : monthLabel(month)}</span>
          <button className="rounded p-1.5 hover:bg-panel disabled:opacity-30" disabled={month === 'all'} onClick={() => setMonth(shiftMonth(month, 1))}><Icon name="next" size={18} /></button>
        </div>
        <button className="text-sm font-semibold text-navy hover:underline" onClick={() => setMonth(month === 'all' ? currentMonth() : 'all')}>{month === 'all' ? 'Par mois' : 'Toutes périodes'}</button>
        <select className="input w-auto" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="all">Tous les types</option>{(Object.keys(fraisCategories) as FraisKind[]).map((k) => <option key={k} value={k}>{fraisCategories[k].label}</option>)}
        </select>
      </div>

      {frais && shown.length === 0 ? <Empty icon="wallet" title="Aucun frais sur cette période" text="Transport, carburant, repas, loyer, avances… Chaque frais lié à un chantier est déduit de son bénéfice." /> : (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="card overflow-x-auto"><table className="tbl min-w-[680px]">
            <thead><tr><th>Date</th><th>Catégorie</th><th>Chantier / employé</th><th>Note</th><th className="!text-right">Montant</th><th /></tr></thead>
            <tbody>{shown.map((f) => (
              <tr key={f.id}><td>{dateFr(f.date)}</td><td><span className="block text-xs text-ink/50">{fraisCategories[f.kind].label}</span>{f.category}</td>
                <td>{[chName(f.chantierId), empName(f.employeeId)].filter(Boolean).join(' · ')}</td><td className="max-w-[220px] truncate text-ink/70">{f.note}</td>
                <td className="num font-semibold">{money(f.amount)}</td>
                <td className="text-right"><button className="p-1 text-ink/50 hover:text-ink" onClick={() => setEdit(f)}><Icon name="edit" size={16} /></button>
                  <button className="p-1 text-ink/50 hover:text-red-700" onClick={async () => { if (confirmDelete('ce frais')) await remove('frais', [f.id!]) }}><Icon name="trash" size={16} /></button></td></tr>
            ))}</tbody></table></div>
          <aside className="card h-fit p-5">
            <p className="text-sm text-ink/60">Total</p><p className="font-display text-3xl font-bold">{money(total)} DA</p>
            <ul className="mt-4 space-y-2 text-sm">{byCat.map(([k, v]) => <li key={k} className="flex justify-between gap-3"><span className="text-ink/70">{k}</span><span className="num font-semibold">{money(v)}</span></li>)}</ul>
          </aside>
        </div>
      )}

      <Modal open={!!edit} title={edit?.id ? 'Modifier le frais' : 'Nouveau frais'} onClose={() => setEdit(null)} wide>
        {edit && <FraisForm f={edit} onDone={() => setEdit(null)} />}
      </Modal>
    </>
  )
}

function FraisForm({ f, onDone }: { f: Frais; onDone: () => void }) {
  const [v, setV] = useState({ ...f, amount: String(f.amount || '') })
  const chantiers = useLiveQuery(() => db.chantiers.orderBy('name').toArray(), [])
  const employees = useLiveQuery(() => db.employees.orderBy('name').toArray(), [])
  useEffect(() => { if (!fraisCategories[v.kind].items.includes(v.category)) setV((x) => ({ ...x, category: fraisCategories[x.kind].items[0] })) }, [v.kind, v.category])
  return (
    <form className="grid gap-4 sm:grid-cols-3" onSubmit={async (e) => { e.preventDefault(); const amount = parseNum(v.amount); if (amount <= 0) return; await db.frais.put({ ...v, amount, chantierId: v.kind === 'chantier' ? v.chantierId : undefined, employeeId: v.kind === 'avance' ? v.employeeId : v.employeeId }); onDone() }}>
      <Field label="Type" className="sm:col-span-3">
        <div className="flex flex-wrap gap-2">{(Object.keys(fraisCategories) as FraisKind[]).map((k) => (
          <button type="button" key={k} onClick={() => setV({ ...v, kind: k })} className={`rounded-full border px-3.5 py-1.5 text-sm ${v.kind === k ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{fraisCategories[k].label}</button>
        ))}</div>
      </Field>
      <Field label="Date"><input className="input" type="date" required value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></Field>
      <Field label="Catégorie"><select className="input" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>{fraisCategories[v.kind].items.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Montant (DA) *"><input className="input" inputMode="decimal" required autoFocus value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></Field>
      {v.kind === 'chantier' && <Field label="Chantier" className="sm:col-span-2"><select className="input" value={v.chantierId ?? ''} onChange={(e) => setV({ ...v, chantierId: e.target.value ? Number(e.target.value) : undefined })}><option value="">—</option>{chantiers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
      {v.kind === 'avance' && <Field label="Employé *" className="sm:col-span-2"><select className="input" required value={v.employeeId ?? ''} onChange={(e) => setV({ ...v, employeeId: e.target.value ? Number(e.target.value) : undefined })}><option value="">—</option>{employees?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}
      <Field label="Paiement"><select className="input" value={v.payMode} onChange={(e) => setV({ ...v, payMode: e.target.value })}>{['Espèces', 'Chèque', 'Virement', 'CCP', 'Carte'].map((m) => <option key={m}>{m}</option>)}</select></Field>
      <Field label="Note" className="sm:col-span-3"><input className="input" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="ex. Gasoil Béjaïa – Akbou" /></Field>
      <div className="sm:col-span-3"><button className="btn-primary">Enregistrer</button></div>
    </form>
  )
}
