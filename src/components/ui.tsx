import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './icons'

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && <Link to={back.to} className="mb-1 inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink"><Icon name="back" size={16} />{back.label}</Link>}
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Field({ label, children, className = '', hint }: { label: string; children: ReactNode; className?: string; hint?: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/55">{hint}</span>}
    </label>
  )
}

export function Modal({ open, title, onClose, children, wide = false }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:items-center" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-6`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded p-1 hover:bg-panel"><Icon name="x" size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ icon = 'bolt', title, text, action }: { icon?: IconName; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-panel text-ink/50"><Icon name={icon} size={26} /></span>
      <p className="mt-4 text-xl font-bold">{title}</p>
      {text && <p className="mt-1 max-w-md text-ink/60">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'green' | 'red' | 'amber' }) {
  const c = tone === 'green' ? 'text-[#1d7f46]' : tone === 'red' ? 'text-[#c2332b]' : tone === 'amber' ? 'text-[#a86a00]' : ''
  return (
    <div className="card p-5">
      <p className="text-sm text-ink/60">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold tabular-nums ${c}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink/55">{hint}</p>}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'red' | 'amber' | 'blue' }) {
  const t = { neutral: 'bg-panel text-ink/70', green: 'bg-[#e3f4ea] text-[#1d7f46]', red: 'bg-[#fbe7e6] text-[#c2332b]', amber: 'bg-[#fff2d6] text-[#8a5600]', blue: 'bg-[#e3edf9] text-[#1f5fae]' }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${t}`}>{children}</span>
}

/** Confirmation simple avant une suppression */
export const confirmDelete = (what: string) => window.confirm(`Supprimer ${what} ? (récupérable dans la Corbeille)`)
