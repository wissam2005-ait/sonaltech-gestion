import Dexie, { type Table } from 'dexie'

/* ------------------------------------------------------------------ */
/* Toutes les données sont enregistrées sur CET ordinateur (IndexedDB). */
/* Sauvegarde / restauration : page « Sauvegarde ».                     */
/* ------------------------------------------------------------------ */

export interface Company {
  name: string; subtitle: string; legalName: string; activity: string; address: string
  rc: string; art: string; nif: string; nis: string; phone: string; email: string; bank: string
  defaultVat: number; defaultPayment: string
}

export interface Client {
  id?: number; name: string; address: string; activity: string; rc: string; art: string; nif: string; phone: string
}

export type ChantierStatus = 'en_cours' | 'termine' | 'suspendu'
export interface Chantier {
  id?: number; name: string; clientId?: number; address: string; startDate: string; status: ChantierStatus; notes: string
}

export interface Article { id?: number; designation: string; unit: string; price: number }

export type DocType = 'devis' | 'facture' | 'bon' | 'attachement'
export interface Line { designation: string; unit: string; price: number; qty: number }
export interface Payment { date: string; amount: number; mode: string }
export interface Doc {
  id?: number
  type: DocType
  number: number
  year: number
  date: string
  clientId?: number
  chantierId?: number
  object: string
  lines: Line[]
  vatRate: number
  paymentMode: string
  status: 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'paye'
  payments: Payment[]
  sourceId?: number
  createdAt: string
}

export interface Employee { id?: number; name: string; position: string; dailyRate: number; phone: string; active: boolean }

/** P = présent, D = demi-journée, A = absent, C = congé, M = maladie */
export type Presence = 'P' | 'D' | 'A' | 'C' | 'M'
export interface Pointage { id: string; employeeId: number; date: string; status: Presence; chantierId?: number }

export type FraisKind = 'chantier' | 'general' | 'avance'
export interface Frais {
  id?: number; date: string; kind: FraisKind; category: string; amount: number
  chantierId?: number; employeeId?: number; payMode: string; note: string
}

export interface Setting { key: string; value: unknown }

class GestionDB extends Dexie {
  clients!: Table<Client, number>
  chantiers!: Table<Chantier, number>
  articles!: Table<Article, number>
  docs!: Table<Doc, number>
  employees!: Table<Employee, number>
  pointages!: Table<Pointage, string>
  frais!: Table<Frais, number>
  settings!: Table<Setting, string>

  constructor() {
    super('sonaltech-gestion')
    this.version(1).stores({
      clients: '++id, name',
      chantiers: '++id, name, clientId, status',
      articles: '++id, designation',
      docs: '++id, type, [type+year], clientId, chantierId, date, status',
      employees: '++id, name, active',
      pointages: 'id, employeeId, date, chantierId',
      frais: '++id, date, kind, chantierId, employeeId',
      settings: 'key',
    })
  }
}

export const db = new GestionDB()

/* ------------------------------ Valeurs de départ ------------------------------ */

export const defaultCompany: Company = {
  name: 'Sonaltech Électrique',
  subtitle: "Entreprise d'électricité générale",
  legalName: 'ETS SONALTECH ELECTRIQUE',
  activity: "Entreprise de travaux d'électricité",
  address: 'Village El Ghaba, CNE Smaoun, W. de Béjaïa',
  rc: '22A5815909-00/06',
  art: '06120040283',
  nif: '29806020070132000000',
  nis: '',
  phone: '0770 337 963',
  email: '',
  bank: '',
  defaultVat: 0,
  defaultPayment: 'Par chèque',
}

/** Articles relevés sur une facture du client (prix modifiables dans « Catalogue »). */
const seedArticles: Omit<Article, 'id'>[] = [
  ['F/P bloc autonome', 'U', 4800], ['F/P spot 24W', 'U', 1100], ['F/P spot 3D 16W', 'U', 750],
  ['F/P prise', 'U', 400], ['F/P interrupteur simple allumage', 'U', 400], ['F/P télérupteur', 'U', 2400],
  ['F/P goulotte 100x50', 'ML', 1800], ['F/P rail oméga', 'ML', 400], ['F/P contacteur D12', 'U', 4200],
  ['F/P contacteur D09', 'U', 3500], ['F/P disjoncteur 1 pôle 16A', 'U', 400], ['F/P disjoncteur 4 pôles 32A', 'U', 5500],
  ['F/P disjoncteur 4 pôles 40A', 'U', 5500], ['F/P détecteur de gaz', 'U', 3200], ['F/P câble 4x10 mm²', 'ML', 1800],
  ['F/P câble 2x1,5 mm²', 'ML', 290], ['F/P boîte de dérivation 100x100 apparente', 'U', 450], ['F/P minuterie 10 min', 'U', 3200],
].map(([designation, unit, price]) => ({ designation: designation as string, unit: unit as string, price: price as number }))

export async function seedIfEmpty() {
  if (!(await db.settings.get('company'))) {
    await db.transaction('rw', db.settings, db.articles, async () => {
      await db.settings.put({ key: 'company', value: defaultCompany })
      if ((await db.articles.count()) === 0) await db.articles.bulkAdd(seedArticles)
    })
  }
}

export async function getCompany(): Promise<Company> {
  const s = await db.settings.get('company')
  return { ...defaultCompany, ...((s?.value as Partial<Company>) ?? {}) }
}

/* ------------------------------ Numérotation ------------------------------ */

/** Prochain numéro pour ce type et cette année (« 28/2026 »). Le premier numéro est réglable dans Paramètres. */
export async function nextNumber(type: DocType, year: number): Promise<number> {
  const docs = await db.docs.where('[type+year]').equals([type, year]).toArray()
  const max = docs.reduce((m, d) => Math.max(m, d.number), 0)
  const start = ((await db.settings.get(`start-${type}-${year}`))?.value as number | undefined) ?? 1
  return Math.max(max + 1, start)
}

/* ------------------------------ Calculs ------------------------------ */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const lineTotal = (l: Line) => round2((l.price || 0) * (l.qty || 0))
export function docTotals(d: Pick<Doc, 'lines' | 'vatRate'>) {
  const ht = round2(d.lines.reduce((s, l) => s + lineTotal(l), 0))
  const vat = round2(ht * (d.vatRate || 0) / 100)
  return { ht, vat, ttc: round2(ht + vat) }
}
export const paidAmount = (d: Doc) => round2((d.payments ?? []).reduce((s, p) => s + p.amount, 0))

export const docLabels: Record<DocType, { one: string; many: string; title: string }> = {
  devis: { one: 'Devis', many: 'Devis', title: 'DEVIS N°' },
  facture: { one: 'Facture', many: 'Factures', title: 'FACTURE N°' },
  bon: { one: 'Bon pour', many: 'Bons pour', title: 'BON POUR N°' },
  attachement: { one: 'Attachement', many: 'Attachements', title: 'ATTACHEMENT N°' },
}

export const presenceLabels: Record<Presence, { label: string; value: number; cls: string }> = {
  P: { label: 'Présent', value: 1, cls: 'bg-[#1d7f46] text-white' },
  D: { label: 'Demi-journée', value: 0.5, cls: 'bg-[#7bc59a] text-ink' },
  A: { label: 'Absent', value: 0, cls: 'bg-[#c2332b] text-white' },
  C: { label: 'Congé', value: 0, cls: 'bg-[#1f5fae] text-white' },
  M: { label: 'Maladie', value: 0, cls: 'bg-[#a86a00] text-white' },
}

export const fraisCategories: Record<FraisKind, { label: string; items: string[] }> = {
  chantier: { label: 'Frais de chantier', items: ['Transport', 'Carburant', 'Repas', 'Location d’outils', 'Matériel', 'Sous-traitance', 'Autre'] },
  general: { label: 'Frais généraux', items: ['Loyer', 'Téléphone / internet', 'Véhicule', 'Assurance', 'Impôts et taxes', 'Fournitures', 'Électricité / eau', 'Autre'] },
  avance: { label: 'Avances aux employés', items: ['Avance sur salaire', 'Remboursement de frais'] },
}
