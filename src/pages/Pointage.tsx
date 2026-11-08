import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, presenceLabels, remove, type Presence } from '../lib/db'
import { currentMonth, daysOfMonth, isWeekend, money, monthLabel, shiftMonth, todayIso } from '../lib/format'
import { downloadXlsx, ref, ST, type Sheet } from '../lib/xlsx'
import { tablePdf } from '../lib/pdf'
import { getCompany } from '../lib/db'
import { Empty, PageHeader } from '../components/ui'
import { Icon } from '../components/icons'

const cycle: (Presence | null)[] = [null, 'P', 'D', 'A', 'C', 'M']

export default function PointagePage() {
  const [month, setMonth] = useState(currentMonth())
  const [chantierId, setChantierId] = useState<number | undefined>()
  const days = daysOfMonth(month)
  const employees = useLiveQuery(() => db.employees.orderBy('name').toArray(), [])
  const chantiers = useLiveQuery(() => db.chantiers.where('status').equals('en_cours').toArray(), [])
  const allChantiers = useLiveQuery(() => db.chantiers.toArray(), [])
  const points = useLiveQuery(() => db.pointages.where('date').between(`${month}-01`, `${month}-31`, true, true).toArray(), [month])
  const avances = useLiveQuery(() => db.frais.where('date').between(`${month}-01`, `${month}-31`, true, true).filter((f) => f.kind === 'avance').toArray(), [month])
  const get = (eid: number, d: string) => points?.find((p) => p.employeeId === eid && p.date === d)

  const shown = (employees ?? []).filter((e) => e.active || points?.some((p) => p.employeeId === e.id))
  const stats = (eid: number) => {
    const ps = (points ?? []).filter((p) => p.employeeId === eid)
    const worked = ps.reduce((s, p) => s + presenceLabels[p.status].value, 0)
    const absent = ps.filter((p) => p.status === 'A').length
    const rate = employees?.find((e) => e.id === eid)?.dailyRate ?? 0
    const adv = (avances ?? []).filter((f) => f.employeeId === eid && f.category === 'Avance sur salaire').reduce((s, f) => s + f.amount, 0)
    return { worked, absent, gross: worked * rate, adv, net: worked * rate - adv }
  }

  async function toggle(eid: number, d: string) {
    const cur = get(eid, d)
    const next = cycle[(cycle.indexOf(cur?.status ?? null) + 1) % cycle.length]
    const id = `${eid}|${d}`
    if (next) await db.pointages.put({ id, employeeId: eid, date: d, status: next, chantierId: cur?.chantierId ?? chantierId })
    else await remove('pointages', [id])
  }
  async function allPresent(d: string) {
    await db.pointages.bulkPut(shown.filter((e) => e.active && !get(e.id!, d)).map((e) => ({ id: `${e.id}|${d}`, employeeId: e.id!, date: d, status: 'P' as Presence, chantierId })))
  }

  function exportExcel() {
    const rows: Sheet['rows'] = [[{ v: `Pointage — ${monthLabel(month)}`, s: ST.bold }], []]
    rows.push([{ v: 'Employé', s: ST.head }, ...days.map((d) => ({ v: Number(d.slice(8)), s: ST.head })), { v: 'Jours', s: ST.head }, { v: 'Tarif/j', s: ST.head }, { v: 'Brut', s: ST.head }, { v: 'Avances', s: ST.head }, { v: 'Net', s: ST.head }])
    shown.forEach((e) => {
      const r = rows.length, st = stats(e.id!), n = days.length
      rows.push([{ v: e.name, s: ST.cell }, ...days.map((d) => ({ v: get(e.id!, d)?.status ?? '', s: ST.cell })),
        { v: st.worked, f: `COUNTIF(${ref(1, r)}:${ref(n, r)},"P")+COUNTIF(${ref(1, r)}:${ref(n, r)},"D")/2`, s: ST.cellNum },
        { v: e.dailyRate, s: ST.cellNum }, { v: st.gross, f: `${ref(n + 1, r)}*${ref(n + 2, r)}`, s: ST.cellNum },
        { v: st.adv, s: ST.cellNum }, { v: st.net, f: `${ref(n + 3, r)}-${ref(n + 4, r)}`, s: ST.numBold }])
    })
    rows.push([], [{ v: 'P = présent · D = demi-journée · A = absent · C = congé · M = maladie' }])
    downloadXlsx(`Pointage ${month}`, [{ name: 'Pointage', rows, widths: [24, ...days.map(() => 3.6), 7, 10, 12, 11, 12] }])
  }

  async function exportPdf() {
    const totals = shown.map((e) => stats(e.id!))
    tablePdf({
      company: await getCompany(), landscape: true, fileName: `Pointage et salaires ${month}.pdf`,
      title: `Pointage et salaires — ${monthLabel(month)}`, subtitle: 'P présent · D demi-journée · A absent · C congé · M maladie',
      head: ['Employé', ...days.map((d) => d.slice(8)), 'Jours', 'Tarif/j', 'Brut', 'Avances', 'Net'],
      body: shown.map((e, i) => [e.name, ...days.map((d) => get(e.id!, d)?.status ?? ''), totals[i].worked, money(e.dailyRate), money(totals[i].gross), totals[i].adv ? money(totals[i].adv) : '', money(totals[i].net)]),
      foot: ['Total', ...days.map(() => ''), totals.reduce((s, x) => s + x.worked, 0), '', money(totals.reduce((s, x) => s + x.gross, 0)), money(totals.reduce((s, x) => s + x.adv, 0)), money(totals.reduce((s, x) => s + x.net, 0))],
      align: ['left', ...days.map(() => 'center' as const), 'right', 'right', 'right', 'right', 'right'],
    })
  }

  return (
    <>
      <PageHeader title="Pointage" subtitle="Cliquez sur une case pour changer : Présent → Demi-journée → Absent → Congé → Maladie → vide."
        actions={<>
          <button className="btn-ghost" onClick={() => window.print()}><Icon name="print" size={16} /> Imprimer</button>
          <button className="btn-volt" onClick={exportPdf}><Icon name="download" size={16} /> PDF</button>
          <button className="btn-ghost" onClick={exportExcel}><Icon name="sheet" size={16} /> Excel</button>
        </>} />
      <div className="no-print mb-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-line bg-white p-1">
          <button className="rounded p-1.5 hover:bg-panel" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mois précédent"><Icon name="back" size={18} /></button>
          <span className="min-w-[150px] text-center font-semibold capitalize">{monthLabel(month)}</span>
          <button className="rounded p-1.5 hover:bg-panel" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mois suivant"><Icon name="next" size={18} /></button>
        </div>
        <label className="text-sm"><span className="label">Chantier noté sur les nouvelles cases</span>
          <select className="input w-64" value={chantierId ?? ''} onChange={(e) => setChantierId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">— Aucun —</option>{chantiers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        {month === currentMonth() && <button className="btn-primary" onClick={() => allPresent(todayIso())}><Icon name="check" size={16} /> Tout le monde présent aujourd'hui</button>}
      </div>
      <h2 className="mb-2 hidden text-2xl font-bold capitalize print:block">Pointage — {monthLabel(month)}</h2>

      {employees && shown.length === 0 ? <Empty icon="users" title="Aucun employé" text="Ajoutez d'abord votre équipe dans « Employés »." /> : (
        <div className="card overflow-x-auto print:overflow-visible print:shadow-none">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#f6f8fa]">
                <th className="sticky left-0 z-10 bg-[#f6f8fa] px-3 py-2 text-left text-sm">Employé</th>
                {days.map((d) => <th key={d} className={`w-7 px-0.5 py-2 text-center font-semibold ${isWeekend(d) ? 'bg-[#e6eaef] text-ink/40' : ''} ${d === todayIso() ? 'text-brand' : ''}`}>{Number(d.slice(8))}</th>)}
                <th className="px-2 text-right">Jours</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => {
                const st = stats(e.id!)
                return (
                  <tr key={e.id} className="border-t border-line">
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 text-sm font-semibold">{e.name}</td>
                    {days.map((d) => {
                      const p = get(e.id!, d)
                      const ch = p?.chantierId ? allChantiers?.find((c) => c.id === p.chantierId)?.name : ''
                      return (
                        <td key={d} className={`p-0.5 text-center ${isWeekend(d) ? 'bg-[#f2f4f7]' : ''}`}>
                          <button type="button" onClick={() => toggle(e.id!, d)} title={`${d.split('-').reverse().join('/')}${p ? ` — ${presenceLabels[p.status].label}` : ''}${ch ? ` — ${ch}` : ''}`}
                            className={`h-7 w-6 rounded text-[11px] font-bold ${p ? presenceLabels[p.status].cls : 'border border-dashed border-line text-transparent hover:border-ink/40'}`}>
                            {p?.status ?? '·'}
                          </button>
                        </td>
                      )
                    })}
                    <td className="px-2 text-right font-semibold tabular-nums">{st.worked}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {shown.length > 0 && (
        <section className="card mt-6 overflow-x-auto break-inside-avoid">
          <h2 className="px-4 pt-4 text-2xl font-bold capitalize">Salaires — {monthLabel(month)}</h2>
          <table className="tbl mt-2 min-w-[620px]">
            <thead><tr><th>Employé</th><th className="!text-right">Jours</th><th className="!text-right">Absences</th><th className="!text-right">Tarif / jour</th><th className="!text-right">Brut</th><th className="!text-right">Avances</th><th className="!text-right">Net à payer</th></tr></thead>
            <tbody>
              {shown.map((e) => { const st = stats(e.id!); return (
                <tr key={e.id}><td className="font-semibold">{e.name}</td><td className="num">{st.worked}</td><td className="num">{st.absent || ''}</td><td className="num">{money(e.dailyRate)}</td>
                  <td className="num">{money(st.gross)}</td><td className="num">{st.adv ? `− ${money(st.adv)}` : ''}</td><td className="num font-bold">{money(st.net)} DA</td></tr>
              ) })}
              <tr className="bg-[#f6f8fa] font-bold"><td>Total</td><td className="num">{shown.reduce((s, e) => s + stats(e.id!).worked, 0)}</td><td /><td /><td className="num">{money(shown.reduce((s, e) => s + stats(e.id!).gross, 0))}</td><td className="num">{money(shown.reduce((s, e) => s + stats(e.id!).adv, 0))}</td><td className="num">{money(shown.reduce((s, e) => s + stats(e.id!).net, 0))} DA</td></tr>
            </tbody>
          </table>
        </section>
      )}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {(Object.keys(presenceLabels) as Presence[]).map((k) => <span key={k} className="flex items-center gap-1.5"><span className={`inline-flex h-5 w-5 items-center justify-center rounded font-bold ${presenceLabels[k].cls}`}>{k}</span>{presenceLabels[k].label}</span>)}
        <span className="text-ink/60">· Net = jours × tarif journalier − avances sur salaire du mois (saisies dans « Frais »)</span>
      </div>
    </>
  )
}
