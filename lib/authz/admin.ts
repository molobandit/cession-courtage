import { prisma } from "@/lib/prisma";
import { isAdmin, requireAdmin, type Actor } from "@/lib/authz/actor";
import { ForbiddenError } from "@/lib/authz/errors";

export async function listPendingOriasUsers(actor: Actor) {
  if (!isAdmin(actor)) throw new ForbiddenError("Réservé aux administrateurs.");
  return prisma.user.findMany({
    where: { role: { notIn: ["ADMIN", "INVESTOR"] }, oriasVerifiedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      oriasNumber: true,
      role: true,
      kycStatus: true,
      createdAt: true,
      firm: { select: { legalName: true, siren: true } },
    },
  });
}

export async function verifyOrias(userId: string) {
  const admin = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new ForbiddenError("Utilisateur introuvable.");
  if (target.role === "ADMIN") throw new ForbiddenError("Un administrateur n'a pas à être validé.");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { oriasVerifiedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "ORIAS_VERIFY",
      entityType: "User",
      entityId: userId,
      metadata: { oriasNumber: target.oriasNumber },
    },
  });
  return updated;
}

export async function rejectOrias(userId: string, reason: string) {
  const admin = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new ForbiddenError("Utilisateur introuvable.");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { kycStatus: "REJECTED" },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "ORIAS_REJECT",
      entityType: "User",
      entityId: userId,
      metadata: { oriasNumber: target.oriasNumber, reason },
    },
  });
  return updated;
}

function assertAdmin(actor: Actor) {
  if (!isAdmin(actor)) throw new ForbiddenError("Réservé aux administrateurs.");
}

export async function listInvestorInquiries(actor: Actor) {
  assertAdmin(actor);
  return prisma.investorInquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: { listing: { select: { id: true, publicNumber: true } } },
  });
}

export async function countUnreadInvestorInquiries(actor: Actor) {
  assertAdmin(actor);
  return prisma.investorInquiry.count({ where: { readAt: null } });
}

export async function setInvestorInquiryRead(inquiryId: string, read: boolean) {
  await requireAdmin();
  const existing = await prisma.investorInquiry.findUnique({
    where: { id: inquiryId },
    select: { id: true },
  });
  if (!existing) throw new ForbiddenError("Demande introuvable.");
  return prisma.investorInquiry.update({
    where: { id: inquiryId },
    data: { readAt: read ? new Date() : null },
  });
}

export async function listCertificationRequests(actor: Actor) {
  assertAdmin(actor);
  return prisma.listing.findMany({
    where: { certificationRequested: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      publicNumber: true,
      displayedZone: true,
      status: true,
      certificationStatus: true,
      updatedAt: true,
      createdAt: true,
      certificationDocs: {
        select: { category: true, label: true, status: true },
      },
    },
  });
}
