import { docLabels, docTotals, lineTotal, type Client, type Company, type Doc } from '../lib/db'
import { amountInWords, dateFr, money, qtyFmt } from '../lib/format'
import { docRef, sumWordsLabel } from '../lib/docs'
import logoUrl from '../assets/logo-sonaltech.png'

/** Le document tel qu'il s'imprime (A4), au format des factures de l'entreprise. */
export default function PrintedDoc({ doc, company, client, chantierName }: { doc: Doc; company: Company; client?: Client; chantierName?: string }) {
  const t = docTotals(doc)
  const Row = ({ k, v }: { k: string; v?: string }) => (
    <p className="leading-snug"><span className="text-ink/80">{k} :</span> <span className="font-semibold">{v}</span></p>
  )
  return (
    <article className="mx-auto w-full max-w-[210mm] bg-white px-[10mm] py-[8mm] text-[12px] text-black print:max-w-none print:p-0">
      <header className="flex justify-center">
        <img src={logoUrl} alt={company.name} className="h-auto w-[150mm] max-w-full" />
      </header>

      <div className="mt-6 flex items-end justify-between px-[8%] text-[14px] font-semibold">
        <p>{docLabels[doc.type].title} : {docRef(doc)}</p>
        <p>Date : {dateFr(doc.date)}</p>
      </div>

      <section className="mt-3 grid grid-cols-2 border border-black/70">
        <div className="space-y-0.5 border-r border-black/70 p-2.5">
          <p className="font-bold uppercase">{company.legalName}</p>
          <Row k="Activité" v={company.activity} />
          <Row k="Adresse" v={company.address} />
          {company.rc && <Row k="RC" v={company.rc} />}
          {company.art && <Row k="ART" v={company.art} />}
          {company.nif && <Row k="NIF" v={company.nif} />}
          {company.nis && <Row k="NIS" v={company.nis} />}
          <p className="pt-2"><span className="text-ink/80">Téléphone :</span> <span className="font-semibold">{company.phone}</span></p>
        </div>
        <div className="space-y-0.5 p-2.5">
          <p><span className="text-ink/80">A :</span> <span className="ml-6 font-bold uppercase">{client?.name}</span></p>
          <Row k="Adresse" v={client?.address} />
          <Row k="Activité" v={client?.activity} />
          <Row k="RC" v={client?.rc} />
          <Row k="ART" v={client?.art} />
          <Row k="NIF" v={client?.nif} />
          <p className="pt-2"><span className="text-ink/80">Téléphone :</span> <span className="font-semibold">{client?.phone}</span></p>
        </div>
      </section>

      {(doc.object || chantierName) && (
        <p className="mt-3 text-[13px]"><span className="font-bold">Objet :</span> {[doc.object, chantierName && !doc.object.includes(chantierName) ? `Chantier : ${chantierName}` : ''].filter(Boolean).join(' — ')}</p>
      )}

      <table className="mt-4 w-full border-collapse border border-black/70 text-[12px]">
        <thead className="bg-head">
          <tr className="[&>th]:border [&>th]:border-black/70 [&>th]:px-2 [&>th]:py-1.5 [&>th]:font-bold">
            <th className="w-[52%]">Description</th><th className="w-[5%]">U</th><th className="w-[13%]">PU HT</th><th className="w-[12%]">Quantité</th><th className="w-[18%]">Montant HT</th>
          </tr>
        </thead>
        <tbody className="[&>tr>td]:border-x [&>tr>td]:border-black/70 [&>tr>td]:px-2 [&>tr>td]:py-[3px]">
          {doc.lines.map((l, i) => (
            <tr key={i} className="break-inside-avoid">
              <td className="font-mono text-[11.5px] font-bold">{l.designation}</td>
              <td className="text-center">{l.unit}</td>
              <td className="text-right tabular-nums">{money(l.price)}</td>
              <td className="text-center tabular-nums">{qtyFmt(l.qty)}</td>
              <td className="text-right tabular-nums">{money(lineTotal(l))}</td>
            </tr>
          ))}
          <tr className="h-6 border-b border-black/70"><td /><td /><td /><td /><td /></tr>
        </tbody>
      </table>

      <div className="mt-4 flex items-start justify-between gap-6 break-inside-avoid">
        <p className="pt-1 text-[13px] font-bold">Mode de règlement : {doc.paymentMode.toUpperCase()}</p>
        <table className="w-[46%] border-collapse text-[12.5px] [&_td]:border [&_td]:border-black/70 [&_td]:px-2 [&_td]:py-1">
          <tbody>
            <tr><td className="border-0 !border-transparent" /><td className="bg-head text-center font-bold">DZD HT</td><td className="text-right font-bold tabular-nums">{money(t.ht)}</td></tr>
            <tr><td className="border-0 !border-transparent" /><td className="bg-head text-center font-bold">TVA {String(doc.vatRate).padStart(2, '0')} %</td><td className="text-right font-bold tabular-nums">{money(t.vat)}</td></tr>
            <tr><td className="text-center font-bold">TOTAL DZD</td><td className="bg-head text-center font-bold">TTC</td><td className="text-right font-bold tabular-nums">{money(t.ttc)}</td></tr>
          </tbody>
        </table>
      </div>

      <p className="mt-6 break-inside-avoid text-[13px]">{sumWordsLabel[doc.type]} : <span className="font-bold">{amountInWords(t.ttc)}</span>.</p>

      <div className={`mt-8 flex break-inside-avoid ${doc.type === 'devis' || doc.type === 'attachement' ? 'justify-between' : 'justify-end'} px-[10%] pb-16 text-[13px] font-bold italic underline`}>
        {(doc.type === 'devis' || doc.type === 'attachement') && <span>LE CLIENT{doc.type === 'devis' ? ' (bon pour accord)' : ''}</span>}
        <span>ENTREPRISE</span>
      </div>

      {company.bank && <p className="border-t border-black/30 pt-2 text-center text-[11px] text-black/70">Coordonnées de paiement : {company.bank}</p>}
    </article>
  )
}
