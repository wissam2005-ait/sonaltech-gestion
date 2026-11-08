import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, docLabels, getCompany, type Company, type DocType } from '../lib/db'
import { Field, PageHeader } from '../components/ui'
import { Icon } from '../components/icons'
import { parseNum } from '../lib/format'

export default function Parametres() {
  const stored = useLiveQuery(getCompany, [])
  const [c, setC] = useState<Company | null>(null)
  const [saved, setSaved] = useState(false)
  const year = new Date().getFullYear()
  const starts = useLiveQuery(async () => Object.fromEntries(await Promise.all((Object.keys(docLabels) as DocType[]).map(async (t) => [t, ((await db.settings.get(`start-${t}-${year}`))?.value as number | undefined) ?? 1]))), [year])
  useEffect(() => { if (stored && !c) setC(stored) }, [stored, c])
  if (!c) return null
  const set = (k: keyof Company) => (e: { target: { value: string } }) => { setSaved(false); setC({ ...c, [k]: k === 'defaultVat' ? parseNum(e.target.value) : e.target.value }) }

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Ces informations s'impriment sur tous les documents." />
      <form className="card grid gap-4 p-6 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); await db.settings.put({ key: 'company', value: c }); setSaved(true) }}>
        <Field label="Nom (en-tête rouge)"><input className="input" value={c.name} onChange={set('name')} /></Field>
        <Field label="Sous-titre"><input className="input" value={c.subtitle} onChange={set('subtitle')} /></Field>
        <Field label="Raison sociale (cadre entreprise)"><input className="input" value={c.legalName} onChange={set('legalName')} /></Field>
        <Field label="Activité"><input className="input" value={c.activity} onChange={set('activity')} /></Field>
        <Field label="Adresse" className="sm:col-span-2"><input className="input" value={c.address} onChange={set('address')} /></Field>
        <Field label="RC"><input className="input" value={c.rc} onChange={set('rc')} /></Field>
        <Field label="ART"><input className="input" value={c.art} onChange={set('art')} /></Field>
        <Field label="NIF"><input className="input" value={c.nif} onChange={set('nif')} /></Field>
        <Field label="NIS (facultatif)"><input className="input" value={c.nis} onChange={set('nis')} /></Field>
        <Field label="Téléphone"><input className="input" value={c.phone} onChange={set('phone')} /></Field>
        <Field label="E-mail"><input className="input" value={c.email} onChange={set('email')} /></Field>
        <Field label="Coordonnées de paiement (RIB / CCP, en bas des documents)" className="sm:col-span-2"><input className="input" value={c.bank} onChange={set('bank')} /></Field>
        <Field label="TVA par défaut (%)" hint="0 si l'entreprise n'est pas assujettie."><input className="input" type="number" min={0} step="0.01" value={c.defaultVat} onChange={set('defaultVat')} /></Field>
        <Field label="Mode de règlement par défaut"><input className="input" value={c.defaultPayment} onChange={set('defaultPayment')} /></Field>
        <div className="flex items-center gap-3 sm:col-span-2"><button className="btn-primary">Enregistrer</button>{saved && <span className="flex items-center gap-1 text-sm text-[#1d7f46]"><Icon name="check" size={16} /> Enregistré</span>}</div>
      </form>

      <section className="card mt-6 p-6">
        <h2 className="text-2xl font-bold">Numérotation {year}</h2>
        <p className="mt-1 text-sm text-ink/60">Pour continuer la numérotation de votre ancien fichier Excel : indiquez le premier numéro à utiliser cette année (ex. 29 si votre dernière facture était la 28/{year}).</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {(Object.keys(docLabels) as DocType[]).map((t) => (
            <Field key={t} label={`${docLabels[t].many} — à partir du n°`}>
              <input className="input" type="number" min={1} value={starts?.[t] ?? 1} onChange={async (e) => db.settings.put({ key: `start-${t}-${year}`, value: Math.max(1, parseInt(e.target.value) || 1) })} />
            </Field>
          ))}
        </div>
      </section>
    </>
  )
}
