import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/direct/print-button";
import { getActor, isOriasVerified } from "@/lib/authz";
import {
  buildDocument,
  documentsFor,
  formatLongDate,
  type DocumentContext,
} from "@/lib/direct/documents";
import { findMyDirectDeal } from "@/lib/direct/load";
import { loadDocumentParty } from "@/lib/direct/parties";
import { readTransferCarriers } from "@/lib/direct/services";
import type { DirectStage } from "@/lib/direct/stages";

export const metadata = { title: "Pièce du dossier" };

/*
 * À l'impression, seule la pièce sort : l'en-tête et le pied du site n'ont rien
 * à faire sur un acte qu'on signe et qu'on envoie à une compagnie.
 */
const PRINT_CSS = `
@page { size: A4; margin: 18mm 16mm; }
@media print {
  header, footer, nav, [data-print-hide] { display: none !important; }
  body { background: #fff !important; }
  [data-piece] { box-shadow: none !important; border: 0 !important; padding: 0 !important; max-width: none !important; }
}
`;

export default async function DirectDealPiecePage({
  params,
}: {
  params: Promise<{ id: string; piece: string }>;
}) {
  const actor = await getActor();
  const { id, piece } = await params;
  if (!actor) redirect(`/connexion?next=/app/formaliser/${id}/pieces/${piece}`);
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const deal = await findMyDirectDeal(id, actor.id, actor.email);
  if (!deal) notFound();

  const services = { kit: deal.kit, escrow: deal.escrow, attestations: deal.attestations };
  const carriers = readTransferCarriers(deal.carriers);

  // Une pièce qui n'est pas encore ouverte n'existe pas, même en tapant l'adresse.
  const disponible = documentsFor({ stage: deal.stage as DirectStage, services, carriers }).find(
    (p) => p.key === piece,
  );
  if (!disponible?.available) notFound();

  const vendeurId = deal.openerRole === "SELLER" ? deal.openedById : deal.counterpartyUserId;
  const acheteurId = deal.openerRole === "SELLER" ? deal.counterpartyUserId : deal.openedById;
  const [seller, buyer] = await Promise.all([
    loadDocumentParty(vendeurId, deal.openerRole === "SELLER" ? null : deal.counterpartyEmail),
    loadDocumentParty(acheteurId, deal.openerRole === "SELLER" ? deal.counterpartyEmail : null),
  ]);

  const ctx: DocumentContext = {
    dealId: deal.id,
    portfolioLabel: deal.portfolioLabel,
    salePrice: Number(deal.salePrice),
    upfrontPercent: Number(deal.upfrontPercent),
    escrow: deal.escrow,
    seller,
    buyer,
    carriers,
    effectiveDate: deal.transferEffectiveDate,
    deedSignedAt: deal.deedSignedAt,
    issuedAt: new Date(),
  };
  const doc = buildDocument(piece, ctx);
  if (!doc) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <style>{PRINT_CSS}</style>

      <div data-print-hide className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/app/formaliser/${deal.id}`}
          className="text-sm text-muted underline-offset-2 hover:underline"
        >
          Retour au dossier
        </Link>
        <PrintButton />
      </div>

      <article
        data-piece
        className="rounded-2xl border border-line bg-white p-6 text-[14px] leading-relaxed text-ink shadow-sm sm:p-10"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 text-[12px] text-muted">
          <span>Réf. {doc.reference}</span>
          <span>Établi le {formatLongDate(ctx.issuedAt)}</span>
        </div>

        {doc.addressee ? (
          <div className="mt-6 ml-auto w-fit text-[14px]">
            {doc.addressee.map((ligne) => (
              <p key={ligne} className={ligne === doc.addressee![0] ? "font-semibold" : "text-muted"}>
                {ligne}
              </p>
            ))}
          </div>
        ) : null}

        <h1 className="mt-8 text-center text-[22px] font-bold tracking-tight">{doc.title}</h1>
        <p className="mt-1 text-center text-[13px] text-muted">{doc.subtitle}</p>
        {doc.signedAt ? (
          <p className="mt-3 text-center text-[13px] font-medium text-ok">
            Signé électroniquement le {formatLongDate(doc.signedAt)}
          </p>
        ) : null}

        <div className="mt-8 grid gap-5">
          {doc.sections.map((section, i) => (
            <section key={section.heading ?? i}>
              {section.heading ? (
                <h2 className="text-[15px] font-semibold">{section.heading}</h2>
              ) : null}
              {section.paragraphs.map((p) => (
                <p key={p} className="mt-2 text-justify">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        {doc.annex ? (
          <section className="mt-8">
            <h2 className="text-[15px] font-semibold">{doc.annex.heading}</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {doc.annex.columns.map((c) => (
                      <th key={c} className="border border-line px-3 py-2 text-left font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {doc.annex.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="border border-line px-3 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <p className="mt-10">Fait en deux exemplaires, le ____________________ à ____________________</p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {doc.signatories.map((s) => (
            <div key={s.label} className="rounded-xl border border-line p-4">
              <p className="text-[13px] font-semibold">{s.label}</p>
              <p className="mt-1">{s.name}</p>
              <p className="text-[13px] text-muted">{s.capacity}</p>
              <p className="mt-2 text-[12px] text-muted">« Lu et approuvé », signature et cachet</p>
              <div className="mt-2 h-20" />
            </div>
          ))}
        </div>

        <p className="mt-8 border-t border-line pt-4 text-[12px] text-muted">{doc.notice}</p>
      </article>
    </main>
  );
}
