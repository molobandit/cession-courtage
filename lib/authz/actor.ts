import "server-only";
import { UserRole, type KycStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, OriasPendingError, UnauthenticatedError } from "@/lib/authz/errors";

export type Actor = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  firmId: string | null;
  oriasNumber: string | null;
  oriasVerifiedAt: Date | null;
  kycStatus: KycStatus;
  publicAlias: string;
};

export async function getActor(): Promise<Actor | null> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        firmId: true,
        oriasNumber: true,
        oriasVerifiedAt: true,
        kycStatus: true,
        publicAlias: true,
        erasedAt: true,
      },
    });

    /*
     * Un compte efface ne vaut plus session.
     *
     * La session est un jeton autonome : il reste valable jusqu'a son echeance
     * et ne se revoque pas cote serveur. Sans ce refus, la personne connectee
     * au moment de la suppression gardait un acces complet a son compte, ce qui
     * vide l'effacement de son sens.
     */
    if (!user || user.erasedAt) return null;

    const { erasedAt: _efface, ...acteur } = user;
    return acteur;
  } catch (error) {
    console.error("getActor", error);
    return null;
  }
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  return actor;
}

export function isAdmin(actor: Actor): boolean {
  return actor.role === UserRole.ADMIN;
}

export function isOriasVerified(actor: Actor): boolean {
  return isAdmin(actor) || isInvestor(actor) || actor.oriasVerifiedAt !== null;
}

export function isInvestor(actor: Actor): boolean {
  return actor.role === UserRole.INVESTOR;
}

export function canSell(actor: Actor): boolean {
  return actor.role === UserRole.SELLER || actor.role === UserRole.BOTH || isAdmin(actor);
}

export function canBuy(actor: Actor): boolean {
  return actor.role === UserRole.BUYER || actor.role === UserRole.BOTH || isAdmin(actor);
}

export async function requireOriasVerified(): Promise<Actor> {
  const actor = await requireActor();
  if (!isOriasVerified(actor)) throw new OriasPendingError();
  return actor;
}

export async function requireAdmin(): Promise<Actor> {
  const actor = await requireActor();
  if (!isAdmin(actor)) throw new ForbiddenError("Réservé aux administrateurs.");
  return actor;
}

export async function requireSeller(): Promise<Actor> {
  const actor = await requireOriasVerified();
  if (!canSell(actor)) throw new ForbiddenError("Réservé aux cédants.");
  return actor;
}

export async function requireBuyer(): Promise<Actor> {
  const actor = await requireOriasVerified();
  if (!canBuy(actor)) throw new ForbiddenError("Réservé aux acquéreurs.");
  return actor;
}

export async function requireInvestor(): Promise<Actor> {
  const actor = await requireActor();
  if (!isInvestor(actor) && !isAdmin(actor)) {
    throw new ForbiddenError("Réservé aux investisseurs.");
  }
  return actor;
}
