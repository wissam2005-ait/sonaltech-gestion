import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Chantier } from '../lib/db'
import { Badge, Empty, Field, Modal, PageHeader } from '../components/ui'
import { Icon } from '../components/icons'
import { dateFr, todayIso } from '../lib/format'

export const chantierStatus: Record<Chantier['status'], [string, 'blue' | 'green' | 'amber']> = { en_cours: ['En cours', 'blue'], termine: ['Terminé', 'green'], suspendu: ['Suspendu', 'amber'] }
const emptyChantier = (): Chantier => ({ name: '', address: '', startDate: todayIso(), status: 'en_cours', notes: '' })

export function ChantierForm({ initial, onSaved }: { initial: Chantier; onSaved: (id: number) => void }) {
  const [c, setC] = useState<Chantier>(initial)
  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [])
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); onSaved(await db.chantiers.put({ ...c, name: c.name.trim() })) }}>
      <Field label="Nom du chantier *" className="sm:col-span-2"><input className="input" required autoFocus value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="ex. Villa Grand Vallée" /></Field>
      <Field label="Client"><select className="input" value={c.clientId ?? ''} onChange={(e) => setC({ ...c, clientId: e.target.value ? Number(e.target.value) : undefined })}><option value="">—</option>{clients?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Début"><input className="input" type="date" value={c.startDate} onChange={(e) => setC({ ...c, startDate: e.target.value })} /></Field>
      <Field label="Adresse" className="sm:col-span-2"><input className="input" value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} /></Field>
      <Field label="État"><select className="input" value={c.status} onChange={(e) => setC({ ...c, status: e.target.value as Chantier['status'] })}>{Object.entries(chantierStatus).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="Notes" className="sm:col-span-2"><textarea className="input" rows={3} value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} /></Field>
      <div className="sm:col-span-2"><button className="btn-primary">Enregistrer</button></div>
    </form>
  )
}

export default function Chantiers() {
  const navigate = useNavigate()
  const chantiers = useLiveQuery(() => db.chantiers.reverse().sortBy('startDate'), [])
  const clients = useLiveQuery(() => db.clients.toArray(), [])
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | Chantier['status']>('en_cours')
  const shown = (chantiers ?? []).filter((c) => filter === 'all' || c.status === filter)
  return (
    <>
      <PageHeader title="Chantiers" actions={<button className="btn-volt" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> Nouveau chantier</button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {([['en_cours', 'En cours'], ['termine', 'Terminés'], ['suspendu', 'Suspendus'], ['all', 'Tous']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3.5 py-1.5 text-sm ${filter === k ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{l}</button>
        ))}
      </div>
      {chantiers && shown.length === 0 ? <Empty icon="site" title="Aucun chantier" text="Un chantier regroupe ses documents, ses frais et le pointage de l'équipe, et calcule son bénéfice." /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <Link key={c.id} to={`/chantiers/${c.id}`} className="card p-5 transition hover:-translate-y-0.5 hover:border-ink/30">
              <div className="flex items-start justify-between gap-3"><h2 className="text-2xl font-bold leading-tight">{c.name}</h2><Badge tone={chantierStatus[c.status][1]}>{chantierStatus[c.status][0]}</Badge></div>
              <p className="mt-1 text-sm text-ink/60">{clients?.find((x) => x.id === c.clientId)?.name ?? 'Sans client'} · depuis le {dateFr(c.startDate)}</p>
              {c.address && <p className="mt-2 flex items-center gap-1.5 text-sm text-ink/70"><Icon name="pin" size={14} />{c.address}</p>}
            </Link>
          ))}
        </div>
      )}
      <Modal open={open} title="Nouveau chantier" onClose={() => setOpen(false)} wide>
        <ChantierForm initial={emptyChantier()} onSaved={(id) => { setOpen(false); navigate(`/chantiers/${id}`) }} />
      </Modal>
    </>
  )
}
