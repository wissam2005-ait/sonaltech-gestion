import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, remove, type Employee } from '../lib/db'
import { money, parseNum } from '../lib/format'
import { Badge, Empty, Field, Modal, PageHeader, confirmDelete } from '../components/ui'
import { Icon } from '../components/icons'

export default function Employes() {
  const employees = useLiveQuery(() => db.employees.orderBy('name').toArray(), [])
  const [edit, setEdit] = useState<Employee | null>(null)
  return (
    <>
      <PageHeader title="Employés" subtitle="Le tarif journalier sert au calcul des salaires (pointage) et du coût de main-d'œuvre des chantiers."
        actions={<button className="btn-volt" onClick={() => setEdit({ name: '', position: '', dailyRate: 0, phone: '', active: true })}><Icon name="plus" size={16} /> Nouvel employé</button>} />
      {employees && employees.length === 0 ? <Empty icon="users" title="Aucun employé" text="Ajoutez votre équipe pour faire le pointage." /> : (
        <div className="card overflow-x-auto"><table className="tbl min-w-[560px]">
          <thead><tr><th>Nom</th><th>Poste</th><th>Téléphone</th><th className="!text-right">Tarif / jour</th><th>État</th><th /></tr></thead>
          <tbody>{employees?.map((e) => (
            <tr key={e.id} className={e.active ? '' : 'opacity-60'}><td className="font-semibold">{e.name}</td><td>{e.position}</td><td>{e.phone}</td><td className="num">{money(e.dailyRate)} DA</td>
              <td>{e.active ? <Badge tone="green">Actif</Badge> : <Badge>Parti</Badge>}</td>
              <td className="text-right"><button className="p-1 text-ink/50 hover:text-ink" onClick={() => setEdit(e)}><Icon name="edit" size={16} /></button>
                <button className="p-1 text-ink/50 hover:text-red-700" onClick={async () => { if (confirmDelete(`${e.name} et tout son pointage`)) { await remove('pointages', await db.pointages.where('employeeId').equals(e.id!).primaryKeys()); await remove('employees', [e.id!]) } }}><Icon name="trash" size={16} /></button></td></tr>
          ))}</tbody></table></div>
      )}
      <Modal open={!!edit} title={edit?.id ? 'Modifier l’employé' : 'Nouvel employé'} onClose={() => setEdit(null)}>
        {edit && <EmployeeForm e={edit} onDone={() => setEdit(null)} />}
      </Modal>
    </>
  )
}

function EmployeeForm({ e, onDone }: { e: Employee; onDone: () => void }) {
  const [f, setF] = useState({ ...e, dailyRate: String(e.dailyRate || '') })
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (ev) => { ev.preventDefault(); await db.employees.put({ ...e, ...f, name: f.name.trim(), dailyRate: parseNum(f.dailyRate) }); onDone() }}>
      <Field label="Nom et prénom *" className="sm:col-span-2"><input className="input" required autoFocus value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} /></Field>
      <Field label="Poste"><input className="input" value={f.position} onChange={(x) => setF({ ...f, position: x.target.value })} placeholder="Électricien, aide…" /></Field>
      <Field label="Téléphone"><input className="input" value={f.phone} onChange={(x) => setF({ ...f, phone: x.target.value })} /></Field>
      <Field label="Tarif journalier (DA)"><input className="input" inputMode="decimal" value={f.dailyRate} onChange={(x) => setF({ ...f, dailyRate: x.target.value })} /></Field>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={f.active} onChange={(x) => setF({ ...f, active: x.target.checked })} /> Toujours dans l'entreprise</label>
      <div className="sm:col-span-2"><button className="btn-primary">Enregistrer</button></div>
    </form>
  )
}
