import { isFileVersion } from '../lib/sync'
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { backupAge, exportBackup, importBackup, isPersistent } from '../lib/backup'
import { db } from '../lib/db'
import { PageHeader } from '../components/ui'
import { Icon } from '../components/icons'

export default function Sauvegarde() {
  const age = useLiveQuery(backupAge, [], null)
  const counts = useLiveQuery(async () => ({ docs: await db.docs.count(), clients: await db.clients.count(), frais: await db.frais.count(), pointages: await db.pointages.count() }), [])
  const [persistent, setPersistent] = useState<boolean | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { void isPersistent().then(setPersistent) }, [])

  return (
    <>
      <PageHeader title="Sauvegarde" subtitle="Toutes les données sont enregistrées sur cet ordinateur uniquement. Une sauvegarde régulière sur clé USB vous protège en cas de panne." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-2xl font-bold">Sauvegarder</h2>
          <p className="mt-1 text-ink/70">Télécharge un fichier <code>sauvegarde-sonaltech-AAAA-MM-JJ.json</code> avec tout : {counts ? `${counts.docs} documents, ${counts.clients} clients, ${counts.frais} frais, ${counts.pointages} jours de pointage` : '…'}.</p>
          <p className={`mt-3 text-sm font-semibold ${age === null || age > 7 ? 'text-[#a86a00]' : 'text-[#1d7f46]'}`}>{age === null ? 'Aucune sauvegarde faite pour l’instant.' : age === 0 ? 'Dernière sauvegarde : aujourd’hui.' : `Dernière sauvegarde : il y a ${age} jour${age > 1 ? 's' : ''}.`}</p>
          <button className="btn-volt mt-5" onClick={async () => { await exportBackup(); setMsg({ ok: true, text: 'Sauvegarde téléchargée : copiez le fichier sur une clé USB.' }) }}><Icon name="download" size={16} /> Télécharger la sauvegarde</button>
          <p className="mt-4 text-sm text-ink/60">Conseil : une fois par semaine, et toujours avant de changer d’ordinateur ou de nettoyer le navigateur.</p>
        </section>
        <section className="card p-6">
          <h2 className="text-2xl font-bold">Restaurer</h2>
          <p className="mt-1 text-ink/70">Remet les données d’un fichier de sauvegarde (sur un nouvel ordinateur, ou après un problème). <strong>Les données actuelles sont remplacées.</strong></p>
          <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ''
            if (!f || !window.confirm('Remplacer toutes les données actuelles par celles de ce fichier ?')) return
            try { await importBackup(f); setMsg({ ok: true, text: 'Données restaurées.' }) } catch (err) { setMsg({ ok: false, text: (err as Error).message }) }
          }} />
          <button className="btn-ghost mt-5" onClick={() => input.current?.click()}><Icon name="external" size={16} /> Choisir un fichier de sauvegarde…</button>
        </section>
      </div>
      {msg && <p className={`mt-6 rounded-lg p-4 ${msg.ok ? 'bg-[#e3f4ea] text-[#145a32]' : 'bg-[#fbe7e6] text-[#8e1f19]'}`}>{msg.text}</p>}
      <section className="card mt-6 p-6 text-sm text-ink/70">
        <h2 className="mb-2 text-xl font-bold text-ink">Bon à savoir</h2>
        <ul className="list-disc space-y-1 pl-5">
          {isFileVersion() ? (
            <li>Version « fichier » : les données sont gardées par Chrome sur cet ordinateur, même si vous déplacez ou recopiez le fichier Sonaltech.html. Ouvrez-le <strong>toujours avec le même navigateur</strong> (Chrome), sinon vous ne verrez pas vos données.</li>
          ) : (
            <li>Protection contre l’effacement automatique par le navigateur : <strong>{persistent === null ? '…' : persistent ? 'activée' : 'non accordée'}</strong>{persistent === false && ' — installez l’application (icône ⊕ dans la barre d’adresse de Chrome) pour l’obtenir.'}</li>
          )}
          <li>Ne videz pas « les données de navigation / cookies » de ce site dans Chrome : cela effacerait tout.</li>
          <li>L’application fonctionne sans internet.</li>
        </ul>
      </section>
    </>
  )
}
