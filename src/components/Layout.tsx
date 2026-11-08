import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon, type IconName } from './icons'
import { db, getCompany } from '../lib/db'
import { backupAge } from '../lib/backup'
import SyncBadge from './SyncBadge'
import iconUrl from '../assets/icone-sonaltech.svg'
import { isLoggedIn } from '../lib/sync'

const nav: { title: string; items: { to: string; label: string; icon: IconName; end?: boolean }[] }[] = [
  { title: 'Pilotage', items: [{ to: '/', label: 'Tableau de bord', icon: 'dashboard', end: true }] },
  { title: 'Documents', items: [
    { to: '/documents/devis', label: 'Devis', icon: 'edit' },
    { to: '/documents/facture', label: 'Factures', icon: 'invoice' },
    { to: '/documents/bon', label: 'Bons pour', icon: 'doc' },
    { to: '/documents/attachement', label: 'Attachements', icon: 'sheet' },
    { to: '/archives', label: 'Archives PDF', icon: 'download' },
  ] },
  { title: 'Chantiers', items: [
    { to: '/chantiers', label: 'Chantiers', icon: 'site' },
    { to: '/clients', label: 'Clients', icon: 'clients' },
    { to: '/catalogue', label: 'Catalogue', icon: 'tag' },
  ] },
  { title: 'Équipe et dépenses', items: [
    { to: '/pointage', label: 'Pointage', icon: 'calendar' },
    { to: '/employes', label: 'Employés', icon: 'users' },
    { to: '/frais', label: 'Frais', icon: 'wallet' },
  ] },
  { title: 'Réglages', items: [
    { to: '/parametres', label: 'Paramètres', icon: 'settings' },
    { to: '/corbeille', label: 'Corbeille', icon: 'trash' },
    { to: '/sauvegarde', label: 'Sauvegarde', icon: 'download' },
  ] },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
  const company = useLiveQuery(getCompany, [], undefined)
  const age = useLiveQuery(backupAge, [], null)
  const hasData = useLiveQuery(async () => (await db.docs.count()) + (await db.frais.count()) + (await db.pointages.count()) > 0, [], false)
  const backupLate = hasData && !isLoggedIn() && (age === null || age > 7)

  const sidebar = (
    <nav aria-label="Menu" className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-5">
      {nav.map((g) => (
        <div key={g.title}>
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{g.title}</p>
          {g.items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end}
              className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-[15px] transition ${isActive ? 'bg-white/10 font-semibold text-volt' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}>
              <Icon name={i.icon} size={18} /> {i.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="no-print sticky top-0 hidden h-screen flex-col bg-ink text-white lg:flex">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-0.5"><img src={iconUrl} alt="" className="h-full w-full" /></span>
          <div className="leading-tight"><p className="font-display text-xl font-bold">{company?.name ?? 'Sonaltech'}</p><p className="text-xs text-white/50">Gestion · hors ligne</p></div>
        </div>
        {sidebar}
        <div className="border-t border-white/10 p-2"><SyncBadge /></div>
      </aside>

      <div className="no-print sticky top-0 z-40 flex items-center justify-between bg-ink px-4 py-3 text-white lg:hidden">
        <p className="flex items-center gap-2 font-display text-xl font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-white p-0.5"><img src={iconUrl} alt="" className="h-full w-full" /></span>{company?.name ?? 'Sonaltech'}</p>
        <div className="flex items-center gap-2"><div className="max-w-[170px]"><SyncBadge compact /></div>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}><Icon name={open ? 'x' : 'menu'} size={26} /></button></div>
      </div>
      {open && <div className="no-print fixed inset-x-0 bottom-0 top-[52px] z-40 bg-ink text-white lg:hidden">{sidebar}</div>}

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        {backupLate && location.pathname !== '/sauvegarde' && (
          <NavLink to="/sauvegarde" className="no-print mb-6 flex items-center gap-3 rounded-lg border border-[#a86a00]/30 bg-[#fff6e0] px-4 py-3 text-sm text-[#7a4d00] hover:bg-[#ffefc7]">
            <Icon name="alert" size={18} />
            <span><strong>{age === null ? 'Aucune sauvegarde faite.' : `Dernière sauvegarde il y a ${age} jours.`}</strong> Vos données sont seulement sur cet ordinateur : faites une sauvegarde sur clé USB.</span>
          </NavLink>
        )}
        <Outlet />
      </main>
    </div>
  )
}
