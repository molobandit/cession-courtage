import { notFound, redirect } from "next/navigation";
import { GeneratedDocumentView } from "@/components/documents/generated-document";
import { getActor, isOriasVerified } from "@/lib/authz";
import {
  buildDocument,
  documentsFor,
  type DocumentContext,
} from "@/lib/direct/documents";
import { findMyDirectDeal } from "@/lib/direct/load";
import { loadDocumentParty } from "@/lib/direct/parties";
import { readTransferCarriers } from "@/lib/direct/services";
import type { DirectStage } from "@/lib/direct/stages";

export const metadata = { title: "Pièce du dossier" };

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

  return <GeneratedDocumentView doc={doc} issuedAt={ctx.issuedAt} backHref={`/app/formaliser/${deal.id}`} />;
}
