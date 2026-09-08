import "server-only";
import { DistributionMode, type PortfolioImport } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSeller, type Actor } from "@/lib/authz/actor";
import { ForbiddenError } from "@/lib/authz/errors";

export async function listMyImports(actor?: Actor) {
  const user = actor ?? (await requireSeller());
  return prisma.portfolioImport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      originalFileName: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      completedAt: true,
      portfolioId: true,
      portfolio: { select: { id: true, label: true } },
    },
  });
}

export async function findMyImport(importId: string, actor: Actor): Promise<PortfolioImport | null> {
  const record = await prisma.portfolioImport.findUnique({ where: { id: importId } });
  if (!record || record.userId !== actor.id) return null;
  return record;
}

export async function getMyImport(importId: string, actor?: Actor): Promise<PortfolioImport> {
  const user = actor ?? (await requireSeller());
  const record = await findMyImport(importId, user);
  if (!record) throw new ForbiddenError("Cet import ne vous est pas accessible.");
  return record;
}

/** Newly registered sellers have no firm yet — create a stub cabinet from the ORIAS number. */
export async function ensureSellerFirm(actor: Actor): Promise<Actor> {
  if (actor.firmId) return actor;
  const siren = `9${actor.oriasNumber}`.slice(0, 9);
  // D1 n'offre pas de transaction : on relit d'abord, puis on cree, puis on
  // rattache. Si le rattachement echoue, le cabinet cree est supprime pour ne
  // pas laisser de coquille orpheline.
  const existing = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { firmId: true },
  });
  if (existing?.firmId) return { ...actor, firmId: existing.firmId };

  const created = await prisma.firm.create({
    data: {
      legalName: `Cabinet ORIAS ${actor.oriasNumber}`,
      siren,
      legalForm: "SAS",
      address: "Adresse à compléter",
      postalCode: "75001",
      city: "Paris",
      department: "75",
      region: "Île-de-France",
      distributionMode: DistributionMode.MIXED,
      complianceScore: 50,
    },
  });
  try {
    await prisma.user.update({ where: { id: actor.id }, data: { firmId: created.id } });
  } catch (linkError) {
    await prisma.firm.delete({ where: { id: created.id } }).catch(() => undefined);
    throw linkError;
  }
  const firm = created;
  return { ...actor, firmId: firm.id };
}
