import { zip } from './zip'

/**
 * Export Excel (.xlsx) sans bibliothèque : un .xlsx est une archive ZIP de fichiers XML.
 * Les montants sont des formules : modifier une quantité dans Excel recalcule tout.
 */
type Cell = { v: string | number; f?: string; s?: number } | null
export interface Sheet { name: string; rows: Cell[][]; widths?: number[]; merges?: string[] }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const col = (i: number) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26) } return s }
export const ref = (c: number, r: number) => `${col(c)}${r + 1}`

/** Styles : 0 normal · 1 gras · 2 nombre · 3 nombre gras · 4 en-tête (fond gris, bordure) · 5 cellule bordée · 6 nombre bordé · 7 titre */
export const ST = { normal: 0, bold: 1, num: 2, numBold: 3, head: 4, cell: 5, cellNum: 6, title: 7 } as const
const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
<fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="16"/><color rgb="FFC8102E"/><name val="Arial Black"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC5D3E8"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="center"/></xf>
</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

function sheetXml(s: Sheet) {
  const cols = s.widths ? `<cols>${s.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''
  const rows = s.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => {
    if (!c) return ''
    const a = `r="${ref(ci, ri)}"${c.s ? ` s="${c.s}"` : ''}`
    if (c.f) return `<c ${a}><f>${esc(c.f)}</f></c>`
    return typeof c.v === 'number' ? `<c ${a}><v>${c.v}</v></c>` : `<c ${a} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`
  }).join('')}</row>`).join('')
  const merges = s.merges?.length ? `<mergeCells count="${s.merges.length}">${s.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${rows}</sheetData>${merges}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="portrait" fitToHeight="0"/></worksheet>`
}

export function downloadXlsx(fileName: string, sheets: Sheet[]) {
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: styles },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })),
  ]
  downloadBlob(new Blob([zip(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileName}.xlsx`)
}

/** Nom de fichier sans accents : certains systèmes ignorent sinon le nom (fichier « download »). */
export const safeFileName = (n: string) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w .()-]/g, '-')

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = safeFileName(fileName)
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
