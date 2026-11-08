/* Formats français (Algérie) */
export const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202f/g, ' ')
export const qtyFmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })
export const pad2 = (n: number) => String(n).padStart(2, '0')
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
export const todayIso = () => isoDay(new Date())
export const currentMonth = () => todayIso().slice(0, 7)
export const dateFr = (d: string | null | undefined) => (d ? d.split('-').reverse().join('/') : '')
export function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}
export function daysOfMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const n = new Date(y, m, 0).getDate()
  return Array.from({ length: n }, (_, i) => `${ym}-${pad2(i + 1)}`)
}
/** Week-end en Algérie : vendredi et samedi */
export const isWeekend = (iso: string) => { const d = new Date(iso + 'T12:00:00').getDay(); return d === 5 || d === 6 }
export const parseNum = (s: string) => { const n = Number(String(s).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }
/* ---------- Montant en lettres (factures) ---------- */

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']

function below100(n: number): string {
  if (n <= 16) return UNITS[n]
  if (n < 20) return 'dix-' + UNITS[n - 10]
  if (n < 70) {
    const t = Math.floor(n / 10), u = n % 10
    return TENS[t] + (u === 0 ? '' : u === 1 ? ' et un' : '-' + UNITS[u])
  }
  if (n < 80) return n === 71 ? 'soixante et onze' : 'soixante-' + below100(n - 60)
  if (n === 80) return 'quatre-vingts'
  return 'quatre-vingt-' + below100(n - 80)
}

function below1000(n: number): string {
  const h = Math.floor(n / 100), r = n % 100
  let s = ''
  if (h > 0) s = (h === 1 ? 'cent' : UNITS[h] + ' cent') + (r === 0 && h > 1 ? 's' : '')
  if (r > 0) s += (s ? ' ' : '') + below100(r)
  return s
}

/** 1452.5 → « mille quatre cent cinquante-deux dinars et cinquante centimes » */
export function amountInWords(amount: number): string {
  const total = Math.round(amount * 100)
  let n = Math.floor(total / 100)
  const cents = total % 100
  if (n === 0 && cents === 0) return 'zéro dinar'
  const parts: string[] = []
  const scales: [number, string, string][] = [[1_000_000_000, 'milliard', 'milliards'], [1_000_000, 'million', 'millions']]
  for (const [v, one, many] of scales) {
    const q = Math.floor(n / v)
    if (q > 0) { parts.push(below1000(q) + ' ' + (q > 1 ? many : one)); n %= v }
  }
  const k = Math.floor(n / 1000)
  if (k > 0) { parts.push(k === 1 ? 'mille' : below1000(k).replace(/s$/, '') + ' mille'); n %= 1000 }
  if (n > 0) parts.push(below1000(n))
  let s = parts.join(' ')
  const dinars = Math.floor(total / 100)
  if (dinars > 0) s += (dinars % 1_000_000 === 0 ? ' de' : '') + (dinars > 1 ? ' dinars' : ' dinar')
  if (cents > 0) s += (dinars > 0 ? ' et ' : '') + below100(cents) + (cents > 1 ? ' centimes' : ' centime')
  return s.trim()
}
