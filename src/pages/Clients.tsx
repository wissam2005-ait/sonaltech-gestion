import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Client } from '../lib/db'
import { Empty, Field, Modal, PageHeader, confirmDelete } from '../components/ui'
import { Icon } from '../components/icons'

const emptyClient: Client = { name: '', address: '', activity: '', rc: '', art: '', nif: '', phone: '' }

export function ClientForm({ initial = emptyClient, onSaved }: { initial?: Client; onSaved: (id: number) => void }) {
  const [c, setC] = useState<Client>(initial)
  const set = (k: keyof Client) => (e: { target: { value: string } }) => setC({ ...c, [k]: e.target.value })
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); const id = await db.clients.put({ ...c, name: c.name.trim() }); onSaved(id) }}>
      <Field label="Nom / raison sociale *" className="sm:col-span-2"><input className="input" required autoFocus value={c.name} onChange={set('name')} /></Field>
      <Field label="Adresse" className="sm:col-span-2"><input className="input" value={c.address} onChange={set('address')} /></Field>
      <Field label="Activité"><input className="input" value={c.activity} onChange={set('activity')} /></Field>
      <Field label="Téléphone"><input className="input" value={c.phone} onChange={set('phone')} /></Field>
      <Field label="RC"><input className="input" value={c.rc} onChange={set('rc')} /></Field>
      <Field label="ART"><input className="input" value={c.art} onChange={set('art')} /></Field>
      <Field label="NIF" className="sm:col-span-2"><input className="input" value={c.nif} onChange={set('nif')} /></Field>
      <div className="sm:col-span-2"><button className="btn-primary">Enregistrer</button></div>
    </form>
  )
}

export default function Clients() {
  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [])
  const [edit, setEdit] = useState<Client | null>(null)
  const [q, setQ] = useState('')
  const shown = (clients ?? []).filter((c) => !q || `${c.name} ${c.address} ${c.phone}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Clients" subtitle={`${clients?.length ?? 0} clients`} actions={<button className="btn-volt" onClick={() => setEdit(emptyClient)}><Icon name="plus" size={16} /> Nouveau client</button>} />
      <input className="input mb-4 max-w-xs" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      {clients && clients.length === 0 ? <Empty icon="clients" title="Aucun client" text="Ajoutez vos clients : leurs coordonnées s'imprimeront sur les documents." /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[640px]">
          <thead><tr><th>Nom</th><th>Adresse</th><th>Téléphone</th><th>NIF</th><th /></tr></thead>
          <tbody>{shown.map((c) => (
            <tr key={c.id}><td className="font-semibold">{c.name}</td><td>{c.address}</td><td>{c.phone}</td><td>{c.nif}</td>
              <td className="text-right"><button className="p-1 text-ink/50 hover:text-ink" onClick={() => setEdit(c)}><Icon name="edit" size={16} /></button>
                <button className="p-1 text-ink/50 hover:text-red-700" onClick={async () => { if (confirmDelete(`le client ${c.name}`)) await db.clients.delete(c.id!) }}><Icon name="trash" size={16} /></button></td></tr>
          ))}</tbody></table></div>
      )}
      <Modal open={!!edit} title={edit?.id ? 'Modifier le client' : 'Nouveau client'} onClose={() => setEdit(null)} wide>
        {edit && <ClientForm initial={edit} onSaved={() => setEdit(null)} />}
      </Modal>
    </>
  )
}
