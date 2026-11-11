import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, docLabels, docTotals, paidAmount, presenceLabels, type DocType } from '../lib/db'
import { createDoc, docAmount, docRef } from '../lib/docs'
import { currentMonth, dateFr, money, monthLabel, todayIso } from '../lib/format'
import { Stat } from '../components/ui'
import { Icon } from '../components/icons'

export default function Dashboard() {
  const navigate = useNavigate()
  const month = currentMonth()
  const docs = useLiveQuery(() => db.docs.toArray(), [])
  const frais = useLiveQuery(() => db.frais.where('date').startsWith(month).toArray(), [month])
  const points = useLiveQuery(() => db.pointages.where('date').startsWith(month).toArray(), [month])
  const employees = useLiveQuery(() => db.employees.toArray(), [])
  const clients = useLiveQuery(() => db.clients.toArray(), [])
  const today = useLiveQuery(() => db.pointages.where('date').equals(todayIso()).toArray(), [])

  const billable = (docs ?? []).filter((d) => d.type === 'facture' || d.type === 'bon')
  const billedMonth = billable.filter((d) => d.date.startsWith(month)).reduce((s, d) => s + docTotals(d).ht, 0)
  const toCollect = billable.reduce((s, d) => s + Math.max(0, docTotals(d).ttc - paidAmount(d)), 0)
  const fraisMonth = (frais ?? []).filter((f) => f.kind !== 'avance').reduce((s, f) => s + f.amount, 0)
  const labourMonth = (points ?? []).reduce((s, p) => s + presenceLabels[p.status].value * (employees?.find((e) => e.id === p.employeeId)?.dailyRate ?? 0), 0)
  const result = billedMonth - fraisMonth - labourMonth
  const pendingQuotes = (docs ?? []).filter((d) => d.type === 'devis' && (d.status === 'brouillon' || d.status === 'envoye'))
  const unpaid = billable.filter((d) => docTotals(d).ttc - paidAmount(d) > 0.009 && d.status !== 'brouillon').sort((a, b) => a.date.localeCompare(b.date))
  const recent = [...(docs ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  const presentToday = (today ?? []).filter((p) => p.status === 'P' || p.status === 'D').length

  async function quick(type: DocType) { navigate(`/documents/${type}/${await createDoc(type)}`) }
  const clientName = (id?: number) => clients?.find((c) => c.id === id)?.name ?? '—'

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-widest text-ink/50">Tableau de bord</p><h1 className="text-4xl font-bold capitalize">{monthLabel(month)}</h1></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-volt" onClick={() => quick('facture')}><Icon name="plus" size={16} /> Facture</button>
          <button className="btn-ghost" onClick={() => quick('devis')}>+ Devis</button>
          <button className="btn-ghost" onClick={() => quick('bon')}>+ Bon pour</button>
          <button className="btn-ghost" onClick={() => quick('attachement')}>+ Attachement</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Facturé ce mois (HT)" value={`${money(billedMonth)}`} hint="Factures et bons pour" />
        <Stat label="Reste à encaisser" value={money(toCollect)} tone={toCollect > 0 ? 'amber' : undefined} hint={`${unpaid.length} document${unpaid.length > 1 ? 's' : ''} non soldé${unpaid.length > 1 ? 's' : ''}`} />
        <Stat label="Frais + main-d'œuvre du mois" value={money(fraisMonth + labourMonth)} hint={`Frais ${money(fraisMonth)} · main-d'œuvre ${money(labourMonth)}`} />
        <Stat label="Résultat du mois" value={money(result)} tone={result >= 0 ? 'green' : 'red'} hint="Facturé HT − frais − main-d'œuvre" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-2xl font-bold">À encaisser</h2>
          {unpaid.length === 0 ? <p className="mt-3 text-ink/60">Tout est encaissé.</p> : (
            <table className="tbl mt-3"><tbody>{unpaid.slice(0, 8).map((d) => (
              <tr key={d.id}><td><Link className="font-semibold" to={`/documents/${d.type}/${d.id}`}>{docLabels[d.type].one} {docRef(d)}</Link><span className="block text-xs text-ink/55">{clientName(d.clientId)} · {dateFr(d.date)}</span></td>
                <td className="num font-semibold">{money(docTotals(d).ttc - paidAmount(d))} DA</td></tr>
            ))}</tbody></table>
          )}
        </section>
        <section className="card p-5">
          <h2 className="text-2xl font-bold">Derniers documents</h2>
          {recent.length === 0 ? <p className="mt-3 text-ink/60">Aucun document pour l'instant : créez votre première facture avec le bouton jaune.</p> : (
            <table className="tbl mt-3"><tbody>{recent.map((d) => (
              <tr key={d.id}><td><Link className="font-semibold" to={`/documents/${d.type}/${d.id}`}>{docLabels[d.type].one} {docRef(d)}</Link><span className="block text-xs text-ink/55">{clientName(d.clientId)}</span></td><td className="num">{docAmount(d)}{d.type === 'attachement' ? '' : ' DA'}</td></tr>
            ))}</tbody></table>
          )}
          <p className="mt-4 text-sm text-ink/60">{pendingQuotes.length} devis en attente de réponse · {presentToday} employé{presentToday > 1 ? 's' : ''} pointé{presentToday > 1 ? 's' : ''} présent{presentToday > 1 ? 's' : ''} aujourd'hui</p>
        </section>
      </div>
    </>
  )
}
