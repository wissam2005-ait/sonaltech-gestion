import { useState } from 'react'
import { Icon } from './icons'
import { Modal } from './ui'
import { getServer, isFileVersion, isLoggedIn, login, setServer, syncNow, useSyncStatus } from '../lib/sync'

const ago = (t: number | null) => {
  if (!t) return 'jamais'
  const m = Math.round((Date.now() - t) / 60000)
  return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

/** État de l'enregistrement sur le site (menu de gauche). */
export default function SyncBadge({ compact = false }: { compact?: boolean }) {
  const s = useSyncStatus()
  const [open, setOpen] = useState(false)
  const view = {
    ok: { dot: 'bg-[#3ddc84]', text: 'Enregistré sur le site', sub: ago(s.lastSync) },
    syncing: { dot: 'bg-volt animate-pulse', text: 'Enregistrement…', sub: `${s.pending} modification${s.pending > 1 ? 's' : ''}` },
    pending: { dot: 'bg-volt', text: 'Envoi en attente', sub: `${s.pending} modification${s.pending > 1 ? 's' : ''}` },
    offline: { dot: 'bg-[#f0a33a]', text: 'Hors ligne', sub: s.pending ? `${s.pending} en attente — partiront au retour d'internet` : 'tout est déjà sur le site' },
    error: { dot: 'bg-[#ff6b5e]', text: 'Site injoignable', sub: s.message || 'nouvel essai automatique' },
    login: { dot: 'bg-[#ff6b5e]', text: 'Non connecté au site', sub: 'cliquez pour vous connecter' },
    noserver: { dot: 'bg-white/40', text: 'Enregistré sur cet appareil', sub: 'sans internet · relier un site (facultatif)' },
  }[s.state]
  const needsLogin = !isLoggedIn() || s.state === 'login' || s.state === 'noserver'
  return (
    <>
      <button type="button" onClick={() => (needsLogin ? setOpen(true) : void syncNow())} title="Enregistrement sur le site"
        className={`flex w-full items-center gap-3 rounded-md text-left text-white transition hover:bg-white/5 ${compact ? 'px-2 py-1' : 'px-3 py-2.5'}`}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${view.dot}`} />
        <span className="min-w-0 leading-tight"><span className="block text-sm font-semibold">{view.text}</span>{!compact && <span className="block truncate text-xs text-white/50">{view.sub}</span>}</span>
      </button>
      <LoginModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [server, setSrv] = useState(getServer())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} title="Connexion au site" onClose={onClose}>
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setError(''); setBusy(true)
        try { if (isFileVersion()) setServer(server); await login(password); setPassword(''); onClose() } catch (err) { setError((err as Error).message === 'Failed to fetch' ? 'Site injoignable : vérifiez internet et l’adresse.' : (err as Error).message) } finally { setBusy(false) }
      }}>
        <p className="text-sm text-ink/70">Une fois connecté, tout ce que vous faites est enregistré sur le site et retrouvé sur vos autres appareils. Sans internet, l'application continue de marcher et envoie tout plus tard.</p>
        {isFileVersion() && (
          <label className="block"><span className="label">Adresse du site</span>
            <input className="input" required placeholder="https://sonaltech-gestion.netlify.app" value={server} onChange={(e) => setSrv(e.target.value)} /></label>
        )}
        <label className="block"><span className="label">Mot de passe de l'entreprise</span>
          <input className="input" type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="rounded-md bg-[#fbe7e6] p-3 text-sm text-[#8e1f19]">{error}</p>}
        <button className="btn-primary" disabled={busy}><Icon name="key" size={16} /> {busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </Modal>
  )
}
