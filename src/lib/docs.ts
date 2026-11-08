import { db, docLabels, docTotals, getCompany, lineTotal, nextNumber, type Client, type Company, type Doc, type DocType } from './db'
import { amountInWords, dateFr, todayIso } from './format'
import { downloadXlsx, ref, ST, type Sheet } from './xlsx'

export const docRef = (d: Pick<Doc, 'number' | 'year'>) => `${String(d.number).padStart(2, '0')}/${d.year}`

/** Crée un document vide (ou à partir d'un autre) avec le prochain numéro. */
export async function createDoc(type: DocType, from?: Partial<Doc>): Promise<number> {
  const company = await getCompany()
  const date = todayIso()
  const year = Number(date.slice(0, 4))
  const doc: Doc = {
    type, number: await nextNumber(type, year), year, date,
    clientId: from?.clientId, chantierId: from?.chantierId, object: from?.object ?? '',
    lines: from?.lines?.map((l) => ({ ...l })) ?? [{ designation: '', unit: 'U', price: 0, qty: 1 }],
    vatRate: from?.vatRate ?? company.defaultVat, paymentMode: from?.paymentMode ?? company.defaultPayment,
    status: 'brouillon', payments: [], sourceId: from?.id, createdAt: new Date().toISOString(),
  }
  return db.docs.add(doc)
}

export const sumWordsLabel: Record<DocType, string> = {
  devis: 'Arrêté le présent devis à la somme de',
  facture: 'Arrêtée la présente facture à la somme de',
  bon: 'Arrêté le présent bon à la somme de',
  attachement: 'Arrêté le présent attachement à la somme de',
}

/** Export Excel au même format que le document imprimé, avec formules. */
export async function exportDocExcel(d: Doc) {
  const company: Company = await getCompany()
  const client: Client | undefined = d.clientId ? await db.clients.get(d.clientId) : undefined
  const t = docTotals(d)
  const R: Sheet['rows'] = []
  const push = (...cells: Sheet['rows'][number]) => R.push(cells)
  push({ v: company.name, s: ST.title }); push({ v: company.subtitle.toUpperCase(), s: ST.bold }); push()
  push({ v: `${docLabels[d.type].title} : ${docRef(d)}`, s: ST.bold }, null, null, { v: `Date : ${dateFr(d.date)}`, s: ST.bold })
  push()
  const left = [company.legalName, `Activité : ${company.activity}`, `Adresse : ${company.address}`, `RC : ${company.rc}`, `ART : ${company.art}`, `NIF : ${company.nif}`, `Téléphone : ${company.phone}`]
  const right = [`A : ${client?.name ?? ''}`, `Adresse : ${client?.address ?? ''}`, `Activité : ${client?.activity ?? ''}`, `RC : ${client?.rc ?? ''}`, `ART : ${client?.art ?? ''}`, `NIF : ${client?.nif ?? ''}`, `Téléphone : ${client?.phone ?? ''}`]
  left.forEach((l, i) => push({ v: l, s: i === 0 ? ST.bold : 0 }, null, null, { v: right[i], s: i === 0 ? ST.bold : 0 }))
  if (d.object) { push(); push({ v: `Objet : ${d.object}`, s: ST.bold }) }
  push()
  push({ v: 'Description', s: ST.head }, { v: 'U', s: ST.head }, { v: 'PU HT', s: ST.head }, { v: 'Quantité', s: ST.head }, { v: 'Montant HT', s: ST.head })
  const first = R.length
  for (const l of d.lines) {
    const r = R.length
    push({ v: l.designation, s: ST.cell }, { v: l.unit, s: ST.cell }, { v: l.price, s: ST.cellNum }, { v: l.qty, s: ST.cellNum }, { v: lineTotal(l), f: `${ref(2, r)}*${ref(3, r)}`, s: ST.cellNum })
  }
  const last = R.length - 1
  push()
  const ht = R.length
  push({ v: `Mode de règlement : ${d.paymentMode.toUpperCase()}`, s: ST.bold }, null, null, { v: 'DZD HT', s: ST.head }, { v: t.ht, f: `SUM(${ref(4, first)}:${ref(4, last)})`, s: ST.numBold })
  const vat = R.length
  push(null, null, null, { v: `TVA ${d.vatRate} %`, s: ST.head }, { v: t.vat, f: `ROUND(${ref(4, ht)}*${d.vatRate}/100,2)`, s: ST.numBold })
  push(null, null, { v: 'TOTAL DZD', s: ST.bold }, { v: 'TTC', s: ST.head }, { v: t.ttc, f: `${ref(4, ht)}+${ref(4, vat)}`, s: ST.numBold })
  push()
  push({ v: `${sumWordsLabel[d.type]} : ${amountInWords(t.ttc)}.` })
  push(); push(null, null, null, { v: 'ENTREPRISE', s: ST.bold })
  downloadXlsx(`${docLabels[d.type].one} ${docRef(d).replace('/', '-')}`, [{ name: docLabels[d.type].one, rows: R, widths: [52, 8, 14, 12, 18], merges: ['A1:E1', 'A2:E2'] }])
}
