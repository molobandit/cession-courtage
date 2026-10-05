import "server-only";
import { prisma } from "@/lib/prisma";
import { canBuy, getActor, isInvestor, isOriasVerified } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { findMyDeposit } from "@/lib/listing/deposit";
import { findMyInvestorPosition } from "@/lib/investor/positions";
import { stripeConfigured } from "@/lib/billing/stripe";
import { canReadCedantIdentity, depositReleasesIdentity } from "@/lib/listing/identity-access";
import type { CompanyDocKind, CompanyDocRow } from "@/lib/listing/company-doc-kinds";

export { COMPANY_DOC_KINDS, companyDocLabel, type CompanyDocRow, type CompanyDocKind } from "@/lib/listing/company-doc-kinds";

export async function listCompanyDocs(listingId: string): Promise<CompanyDocRow[]> {
  try {
    const rows = await prisma.listingCompanyDocument.findMany({
      where: { listingId },
      orderBy: { createdAt: "asc" },
      select: { id: true, listingId: true, kind: true, fileName: true, storageKey: true, createdAt: true },
    });
    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("listCompanyDocs", error);
    return [];
  }
}

export async function findCompanyDoc(
  listingId: string,
  documentId: string,
): Promise<CompanyDocRow | null> {
  try {
    const row = await prisma.listingCompanyDocument.findFirst({
      where: { listingId, id: documentId },
      select: { id: true, listingId: true, kind: true, fileName: true, storageKey: true, createdAt: true },
    });
    if (!row) return null;
    return { ...row, createdAt: row.createdAt.toISOString() };
  } catch (error) {
    console.error("findCompanyDoc", error);
    return null;
  }
}

export async function insertCompanyDoc(row: {
  id: string;
  listingId: string;
  kind: CompanyDocKind;
  fileName: string;
  storageKey: string;
  sha256: string;
  uploadedById: string;
}): Promise<void> {
  await prisma.listingCompanyDocument.create({
    data: {
      id: row.id,
      listingId: row.listingId,
      kind: row.kind,
      fileName: row.fileName,
      storageKey: row.storageKey,
      sha256: row.sha256,
      uploadedById: row.uploadedById,
    },
  });
}

export async function actorCanReadCompanyDocs(listingId: string): Promise<boolean> {
  const actor = await getActor();
  if (!actor || !isOriasVerified(actor)) return false;
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { portfolio: { select: { firmId: true } } },
  });
  if (!listing) return false;
  const isOwner = ownsFirm(actor, listing.portfolio.firmId);
  const investor = isInvestor(actor);
  const subscribed = isOwner || investor ? false : await hasContactSubscription(actor);
  // Acquéreur comme investisseur : le dépôt doit être reçu par le trust, pas
  // seulement enregistré. Même règle des deux côtés, celle du dossier de référence.
  const deposit = isOwner
    ? null
    : investor
      ? await findMyInvestorPosition(listingId, actor.id).then((p) =>
          p && depositReleasesIdentity(p.paymentStatus, stripeConfigured()) ? p : null,
        )
      : await findMyDeposit(listingId, actor.id).then((d) =>
          d && depositReleasesIdentity(d.paymentStatus, stripeConfigured()) ? d : null,
        );
  return canReadCedantIdentity({
    isOwner,
    canBuy: canBuy(actor),
    subscribed,
    hasDeposit: Boolean(deposit),
    isInvestor: investor,
  });
}

/**
 * Le jour où le dossier a été remis à ce lecteur, c'est-à-dire celui de son
 * positionnement.
 *
 * La mention « Remis à l'acquéreur X le … » entre dans l'empreinte qui sert de
 * clé au PDF imprimé. Avec la date de lecture, elle changeait chaque jour, et
 * le premier à ouvrir le dossier attendait une nouvelle impression. La date du
 * positionnement ne bouge plus : le fichier est imprimé une fois, puis relu.
 *
 * Rend null faute de positionnement : l'appelant garde alors sa propre date.
 */
export async function positioningDate(listingId: string, actorId: string, investor: boolean): Promise<Date | null> {
  if (investor) {
    const position = await findMyInvestorPosition(listingId, actorId);
    return position?.createdAt ?? null;
  }
  const deposit = await findMyDeposit(listingId, actorId);
  return deposit?.placedAt ?? null;
}
