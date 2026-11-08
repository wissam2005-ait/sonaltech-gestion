/**
 * Génération des PDF dans l'application (sans internet) : documents au format de l'entreprise,
 * feuille de salaires (pointage) et état des frais. Texte vectoriel : net à l'impression, léger, recherchable.
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { db, docLabels, docTotals, getCompany, lineTotal, type Client, type Company, type Doc } from './db'
import { amountInWords, dateFr, money, qtyFmt } from './format'
import { docRef, sumWordsLabel } from './docs'
import { downloadBlob } from './xlsx'

const RED: [number, number, number] = [200, 16, 46]
const INK: [number, number, number] = [11, 31, 51]
const HEAD: [number, number, number] = [197, 211, 232]
const M = 12            // marge (mm)
const W = 210 - 2 * M   // largeur utile

export const pdfName = (d: Doc) => `${docLabels[d.type].one} ${docRef(d).replace('/', '-')}.pdf`

/** Les espaces fines (milliers) ne sont pas dans les polices PDF standard */
const t = (s: string | number | undefined | null) => String(s ?? '').replace(/[\u202f\u00a0]/g, ' ')

function footer(pdf: jsPDF, label: string) {
  const n = pdf.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    pdf.setPage(i); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(120)
    pdf.text(t(label), M, 290)
    if (n > 1) pdf.text(`Page ${i} / ${n}`, 210 - M, 290, { align: 'right' })
  }
}

function header(pdf: jsPDF, c: Company) {
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(26)
  pdf.setTextColor(...RED); pdf.setDrawColor(90, 10, 20); pdf.setLineWidth(0.25)
  pdf.text(t(c.name), 105, 20, { align: 'center', renderingMode: 'fillThenStroke' })
  pdf.setFontSize(11); pdf.setTextColor(...INK)
  const sub = t(c.subtitle.toUpperCase()), cs = 1.2
  pdf.text(sub, 105 - (pdf.getTextWidth(sub) + cs * (sub.length - 1)) / 2, 27, { charSpace: cs })
}

export async function buildDocPdf(doc: Doc, given?: { company?: Company; client?: Client; chantierName?: string }): Promise<jsPDF> {
  const company = given?.company ?? await getCompany()
  const client = given?.client ?? (doc.clientId ? await db.clients.get(doc.clientId) : undefined)
  const chantierName = given?.chantierName ?? (doc.chantierId ? (await db.chantiers.get(doc.chantierId))?.name : undefined)
  const tot = docTotals(doc)
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  pdf.setProperties({ title: pdfName(doc).replace('.pdf', ''), author: company.name, creator: `${company.name} — Gestion` })
  header(pdf, company)

  // N° et date
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(0)
  pdf.text(`${docLabels[doc.type].title} : ${docRef(doc)}`, M + 18, 39)
  pdf.text(`Date : ${dateFr(doc.date)}`, 210 - M - 18, 39, { align: 'right' })

  // Cadres entreprise / client
  const half = W / 2, top = 43, lh = 4.6
  const left: [string, string, boolean?][] = [[company.legalName, '', true], ['Activité', company.activity], ['Adresse', company.address],
    ...(company.rc ? [['RC', company.rc] as [string, string]] : []), ...(company.art ? [['ART', company.art] as [string, string]] : []),
    ...(company.nif ? [['NIF', company.nif] as [string, string]] : []), ...(company.nis ? [['NIS', company.nis] as [string, string]] : [])]
  const right: [string, string][] = [['A', client?.name ?? ''], ['Adresse', client?.address ?? ''], ['Activité', client?.activity ?? ''], ['RC', client?.rc ?? ''], ['ART', client?.art ?? ''], ['NIF', client?.nif ?? '']]
  const writeCol = (rows: [string, string, boolean?][], x: number, maxW: number) => {
    let y = top + 5
    for (const [k, v, title] of rows) {
      pdf.setFontSize(9)
      if (title) { pdf.setFont('helvetica', 'bold'); pdf.text(t(k.toUpperCase()), x, y); y += lh; continue }
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80); const label = `${k} : `; pdf.text(label, x, y)
      const lw = pdf.getTextWidth(label); pdf.setTextColor(0); pdf.setFont('helvetica', 'bold')
      const lines = pdf.splitTextToSize(t(k === 'A' ? v.toUpperCase() : v), maxW - lw) as string[]
      pdf.text(lines.length ? lines : [''], x + lw + (k === 'A' ? 6 : 0), y); y += lh * Math.max(1, lines.length)
    }
    return y
  }
  const yl = writeCol(left, M + 3, half - 6), yr = writeCol(right, M + half + 3, half - 6)
  const telY = Math.max(yl, yr) + 2
  for (const [x, v] of [[M + 3, company.phone], [M + half + 3, client?.phone ?? '']] as [number, string][]) {
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80); pdf.text('Téléphone : ', x, telY)
    pdf.setTextColor(0); pdf.setFont('helvetica', 'bold'); pdf.text(t(v), x + pdf.getTextWidth('Téléphone : '), telY)
  }
  const boxBottom = telY + 3
  pdf.setDrawColor(60); pdf.setLineWidth(0.3); pdf.rect(M, top, W, boxBottom - top); pdf.line(M + half, top, M + half, boxBottom)

  let y = boxBottom + 6
  const objet = [doc.object, chantierName && !doc.object.includes(chantierName) ? `Chantier : ${chantierName}` : ''].filter(Boolean).join(' — ')
  if (objet) {
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.text('Objet : ', M, y)
    pdf.setFont('helvetica', 'normal'); const lines = pdf.splitTextToSize(t(objet), W - 16) as string[]
    pdf.text(lines, M + pdf.getTextWidth('Objet : '), y); y += 4.5 * lines.length + 2
  }

  // Tableau des lignes
  autoTable(pdf, {
    startY: y, margin: { left: M, right: M },
    head: [['Description', 'U', 'PU HT', 'Quantité', 'Montant HT']],
    body: doc.lines.map((l) => [t(l.designation), t(l.unit), t(money(l.price)), t(qtyFmt(l.qty)), t(money(lineTotal(l)))]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.4, lineColor: [60, 60, 60], lineWidth: 0.2, textColor: 0, valign: 'middle' },
    headStyles: { fillColor: HEAD, textColor: 0, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: W * 0.52, font: 'courier', fontStyle: 'bold', fontSize: 8.6 },
      1: { cellWidth: W * 0.05, halign: 'center' }, 2: { cellWidth: W * 0.13, halign: 'right' },
      3: { cellWidth: W * 0.12, halign: 'center' }, 4: { cellWidth: W * 0.18, halign: 'right' },
    },
  })
  y = (pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  if (y > 240) { pdf.addPage(); y = 20 }

  // Règlement et totaux
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text(t(`Mode de règlement : ${doc.paymentMode.toUpperCase()}`), M, y + 4)
  const tx = M + W * 0.54, c1 = W * 0.17, c2 = W * 0.16, c3 = W * 0.13, rh = 6.5
  const rows: [string, string, string][] = [['', 'DZD HT', money(tot.ht)], ['', `TVA ${String(doc.vatRate).padStart(2, '0')} %`, money(tot.vat)], ['TOTAL DZD', 'TTC', money(tot.ttc)]]
  rows.forEach(([a, b, c], i) => {
    const ry = y + i * rh
    if (a) { pdf.rect(tx, ry, c1, rh); pdf.text(a, tx + c1 / 2, ry + 4.4, { align: 'center' }) }
    pdf.setFillColor(...HEAD); pdf.rect(tx + c1, ry, c2, rh, 'FD'); pdf.text(b, tx + c1 + c2 / 2, ry + 4.4, { align: 'center' })
    pdf.rect(tx + c1 + c2, ry, c3 + (W - (W * 0.54) - c1 - c2 - c3), rh); pdf.text(t(c), 210 - M - 2, ry + 4.4, { align: 'right' })
  })
  y += 3 * rh + 9

  // Somme en lettres
  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal')
  const lead = `${sumWordsLabel[doc.type]} : `
  pdf.text(lead, M, y)
  pdf.setFont('helvetica', 'bold')
  const words = pdf.splitTextToSize(t(`${amountInWords(tot.ttc)}.`), W - pdf.getTextWidth(lead)) as string[]
  pdf.text(words, M + pdf.getTextWidth(lead), y); y += 5 * words.length + 10

  // Signatures
  pdf.setFont('helvetica', 'bolditalic'); pdf.setFontSize(10.5)
  const sign = (label: string, x: number) => { pdf.text(label, x, y, { align: 'center' }); const w = pdf.getTextWidth(label); pdf.setLineWidth(0.3); pdf.line(x - w / 2, y + 0.8, x + w / 2, y + 0.8) }
  if (doc.type === 'devis' || doc.type === 'attachement') sign(doc.type === 'devis' ? 'LE CLIENT (bon pour accord)' : 'LE CLIENT', M + W * 0.22)
  sign('ENTREPRISE', M + W * 0.78)

  footer(pdf, company.bank ? `Coordonnées de paiement : ${company.bank}` : `${company.name} — ${company.phone}`)
  return pdf
}

export async function downloadDocPdf(doc: Doc) {
  downloadBlob((await buildDocPdf(doc)).output('blob'), pdfName(doc))
}

/** Ouvre le PDF dans un nouvel onglet (lecture / impression). */
export async function openDocPdf(doc: Doc) {
  const win = window.open('', '_blank')
  const url = URL.createObjectURL((await buildDocPdf(doc)).output('blob'))
  if (win) win.location.href = url
  else downloadBlob(await fetch(url).then((r) => r.blob()), pdfName(doc))
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Simple tableau en PDF (pointage / salaires, frais). */
export function tablePdf(opts: { title: string; subtitle?: string; head: string[]; body: (string | number)[][]; foot?: (string | number)[]; align?: ('left' | 'right' | 'center')[]; company: Company; landscape?: boolean; fileName: string }) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: opts.landscape ? 'landscape' : 'portrait' })
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(...RED); pdf.text(t(opts.company.name), M, 16)
  pdf.setFontSize(13); pdf.setTextColor(...INK); pdf.text(t(opts.title), M, 24)
  if (opts.subtitle) { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(90); pdf.text(t(opts.subtitle), M, 29) }
  const columnStyles = Object.fromEntries((opts.align ?? []).map((a, i) => [i, { halign: a }]))
  autoTable(pdf, {
    startY: opts.subtitle ? 33 : 29, margin: { left: M, right: M },
    head: [opts.head.map(t)], body: opts.body.map((r) => r.map(t)), foot: opts.foot ? [opts.foot.map(t)] : undefined,
    didParseCell: (h) => { if (h.section === 'foot' && opts.align?.[h.column.index]) h.cell.styles.halign = opts.align[h.column.index] },
    theme: 'grid', styles: { fontSize: opts.landscape ? 7 : 8.5, cellPadding: 1.2, lineColor: [150, 150, 150], lineWidth: 0.15, textColor: 0 },
    headStyles: { fillColor: HEAD, textColor: 0, fontStyle: 'bold' }, footStyles: { fillColor: [240, 243, 246], textColor: 0, fontStyle: 'bold' },
    columnStyles,
  })
  footer(pdf, `Édité le ${new Date().toLocaleDateString('fr-FR')}`)
  downloadBlob(pdf.output('blob'), opts.fileName)
}

/** Toutes les factures / devis… d'une période dans un seul fichier ZIP de PDF. */
export async function zipPdfs(docs: Doc[], fileName: string, onProgress?: (n: number) => void) {
  const { zip } = await import('./zip')
  const company = await getCompany()
  const clients = await db.clients.toArray(), chantiers = await db.chantiers.toArray()
  const files: { name: string; data: Uint8Array }[] = []
  for (const [i, d] of docs.entries()) {
    const pdf = await buildDocPdf(d, { company, client: clients.find((c) => c.id === d.clientId), chantierName: chantiers.find((c) => c.id === d.chantierId)?.name })
    files.push({ name: `${docLabels[d.type].many}/${pdfName(d)}`, data: new Uint8Array(pdf.output('arraybuffer')) })
    onProgress?.(i + 1)
  }
  downloadBlob(new Blob([zip(files)], { type: 'application/zip' }), fileName)
}
