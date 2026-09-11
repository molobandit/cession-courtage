import "server-only";
import { prisma } from "@/lib/prisma";
import { canBuy, getActor, isInvestor, isOriasVerified } from "@/lib/authz";
import { ownsFirm } from "@/lib/authz/policies";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import { findMyDeposit } from "@/lib/listing/deposit";
import { findMyInvestorPosition } from "@/lib/investor/positions";
import { canReadCedantIdentity } from "@/lib/listing/identity-access";
import { COMPANY_DOC_KINDS, type CompanyDocRow } from "@/lib/listing/company-doc-kinds";

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
  kind: string;
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
  const deposit = isOwner
    ? null
    : investor
      ? await findMyInvestorPosition(listingId, actor.id)
      : await findMyDeposit(listingId, actor.id);
  return canReadCedantIdentity({
    isOwner,
    canBuy: canBuy(actor),
    subscribed,
    hasDeposit: Boolean(deposit),
    isInvestor: investor,
  });
}
