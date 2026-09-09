import { prisma } from "@/lib/prisma";
import { isAdmin, requireAdmin, type Actor } from "@/lib/authz/actor";
import { ForbiddenError } from "@/lib/authz/errors";

export async function listPendingOriasUsers(actor: Actor) {
  if (!isAdmin(actor)) throw new ForbiddenError("Réservé aux administrateurs.");
  return prisma.user.findMany({
    where: { role: { not: "ADMIN" }, oriasVerifiedAt: null },
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
