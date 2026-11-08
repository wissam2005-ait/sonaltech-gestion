import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Article } from '../lib/db'
import { money, parseNum } from '../lib/format'
import { Field, Modal, PageHeader, confirmDelete } from '../components/ui'
import { Icon } from '../components/icons'

export default function Catalogue() {
  const articles = useLiveQuery(() => db.articles.orderBy('designation').toArray(), [])
  const [edit, setEdit] = useState<Article | null>(null)
  const [q, setQ] = useState('')
  const shown = (articles ?? []).filter((a) => !q || a.designation.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Catalogue des articles" subtitle="Désignation, unité et prix : remplis automatiquement dans les documents."
        actions={<button className="btn-volt" onClick={() => setEdit({ designation: '', unit: 'U', price: 0 })}><Icon name="plus" size={16} /> Nouvel article</button>} />
      <input className="input mb-4 max-w-xs" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card overflow-x-auto"><table className="tbl min-w-[520px]">
        <thead><tr><th>Désignation</th><th>U</th><th className="!text-right">PU HT</th><th /></tr></thead>
        <tbody>{shown.map((a) => (
          <tr key={a.id}><td className="font-mono text-sm font-semibold">{a.designation}</td><td>{a.unit}</td><td className="num">{money(a.price)}</td>
            <td className="text-right"><button className="p-1 text-ink/50 hover:text-ink" onClick={() => setEdit(a)}><Icon name="edit" size={16} /></button>
              <button className="p-1 text-ink/50 hover:text-red-700" onClick={async () => { if (confirmDelete(`« ${a.designation} »`)) await db.articles.delete(a.id!) }}><Icon name="trash" size={16} /></button></td></tr>
        ))}</tbody></table></div>
      <Modal open={!!edit} title={edit?.id ? 'Modifier l’article' : 'Nouvel article'} onClose={() => setEdit(null)}>
        {edit && <ArticleForm a={edit} onDone={() => setEdit(null)} />}
      </Modal>
    </>
  )
}

function ArticleForm({ a, onDone }: { a: Article; onDone: () => void }) {
  const [f, setF] = useState({ ...a, price: String(a.price || '') })
  return (
    <form className="grid gap-4 sm:grid-cols-3" onSubmit={async (e) => { e.preventDefault(); await db.articles.put({ ...a, designation: f.designation.trim(), unit: f.unit.toUpperCase(), price: parseNum(f.price) }); onDone() }}>
      <Field label="Désignation *" className="sm:col-span-3"><input className="input" required autoFocus value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} /></Field>
      <Field label="Unité"><input className="input" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
      <Field label="PU HT (DA)" className="sm:col-span-2"><input className="input" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
      <div className="sm:col-span-3"><button className="btn-primary">Enregistrer</button></div>
    </form>
  )
}
