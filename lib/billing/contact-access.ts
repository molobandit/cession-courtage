import "server-only";
import { prisma } from "@/lib/prisma";
import { isAdmin, type Actor } from "@/lib/authz/actor";

/** L’acheteur doit être abonné pour accéder au détail de l’offre (contact, messages). */
export async function hasContactSubscription(actor: Actor): Promise<boolean> {
  if (isAdmin(actor)) return true;
  const sub = await prisma.subscription.findFirst({
    where: { userId: actor.id, status: "ACTIVE", plan: "GROWTH" },
    select: { id: true },
  });
  return Boolean(sub);
}
