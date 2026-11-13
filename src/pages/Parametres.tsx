import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, docLabels, getCompany, type Company, type DocType } from '../lib/db'
import { Field, PageHeader } from '../components/ui'
import { Icon } from '../components/icons'
import { parseNum } from '../lib/format'
import { changePassword, isLoggedIn, logout } from '../lib/sync'

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
      {isLoggedIn() && <PasswordSection />}
    </>
  )
}

/** Mot de passe du site : à changer ici, sans passer par l'hébergeur. */
function PasswordSection() {
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setMsg(null); setF({ ...f, [k]: e.target.value }) }
  return (
    <section className="card mt-6 p-6">
      <h2 className="text-2xl font-bold">Mot de passe</h2>
      <p className="mt-1 text-sm text-ink/60">Mot de passe pour ouvrir la gestion en ligne. Après un changement, les autres appareils devront se reconnecter avec le nouveau.</p>
      <form className="mt-4 grid gap-4 sm:grid-cols-3" onSubmit={async (e) => {
        e.preventDefault()
        if (f.next.length < 8) return setMsg({ ok: false, text: 'Le nouveau mot de passe doit faire au moins 8 caractères.' })
        if (f.next !== f.confirm) return setMsg({ ok: false, text: 'Les deux nouveaux mots de passe ne sont pas identiques.' })
        setBusy(true)
        try { await changePassword(f.current, f.next); setF({ current: '', next: '', confirm: '' }); setMsg({ ok: true, text: 'Mot de passe changé.' }) }
        catch (err) { setMsg({ ok: false, text: (err as Error).message === 'Failed to fetch' ? 'Il faut une connexion internet pour changer le mot de passe.' : (err as Error).message }) }
        finally { setBusy(false) }
      }}>
        <Field label="Mot de passe actuel"><input className="input" type="password" autoComplete="current-password" required value={f.current} onChange={set('current')} /></Field>
        <Field label="Nouveau mot de passe"><input className="input" type="password" autoComplete="new-password" required minLength={8} value={f.next} onChange={set('next')} /></Field>
        <Field label="Confirmer le nouveau"><input className="input" type="password" autoComplete="new-password" required value={f.confirm} onChange={set('confirm')} /></Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <button className="btn-primary" disabled={busy}><Icon name="key" size={16} /> {busy ? 'Enregistrement…' : 'Changer le mot de passe'}</button>
          <button type="button" className="btn-ghost" onClick={() => { logout(); location.reload() }}>Se déconnecter de cet appareil</button>
          {msg && <span className={`text-sm font-semibold ${msg.ok ? 'text-green-700' : 'text-[#8e1f19]'}`}>{msg.text}</span>}
        </div>
      </form>
    </section>
  )
}
