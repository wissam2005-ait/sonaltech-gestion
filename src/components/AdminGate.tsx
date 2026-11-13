import { useState, type ReactNode } from 'react'
import { Icon } from './icons'
import { isFileVersion, isLoggedIn, login, useSyncStatus } from '../lib/sync'
import logoUrl from '../assets/logo-sonaltech.png'

/**
 * Version en ligne : l'application demande le mot de passe de l'entreprise (une fois par appareil,
 * et de nouveau si le mot de passe a été changé ailleurs).
 * Version fichier (PC sans internet, clé USB) : accès direct.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const status = useSyncStatus()
  const [, refresh] = useState(0)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ok = isFileVersion() || (isLoggedIn() && status.state !== 'login')
  if (ok) return <>{children}</>
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <form className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl" onSubmit={async (e) => {
        e.preventDefault(); setError(''); setBusy(true)
        try { await login(password); setPassword(''); refresh((n) => n + 1) } catch (err) {
          setError((err as Error).message === 'Failed to fetch' ? 'Pas de connexion internet : la première connexion en a besoin.' : (err as Error).message)
        } finally { setBusy(false) }
      }}>
        <img src={logoUrl} alt="Sonaltech Électrique" className="mx-auto w-full max-w-[280px]" />
        <h1 className="mt-6 text-center text-2xl font-bold">Gestion</h1>
        <p className="mt-1 text-center text-sm text-ink/60">Réservé à l'entreprise</p>
        {status.state === 'login' && status.message === 'Reconnectez-vous.' && <p className="mt-4 rounded-md bg-[#fff4d6] p-3 text-sm text-[#6b4e00]">Le mot de passe a été changé : reconnectez-vous.</p>}
        <label className="mt-6 block"><span className="label">Mot de passe</span>
          <input className="input" type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="mt-3 rounded-md bg-[#fbe7e6] p-3 text-sm text-[#8e1f19]">{error}</p>}
        <button className="btn-primary mt-5 w-full" disabled={busy}><Icon name="key" size={16} /> {busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </div>
  )
}
