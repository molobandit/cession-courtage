import "server-only";
import { prisma } from "@/lib/prisma";
import { isAdmin, type Actor } from "@/lib/authz/actor";

/**
 * Accès au détail d'une annonce : contact, messages, dépôt de positionnement.
 *
 * La page d'accueil vend un accès au marché à 250 € HT par an. C'est lui qui
 * ouvre le détail d'un dossier, la messagerie et le dépôt de positionnement.
 * Le catalogue, lui, reste consultable sans rien régler, et mettre un
 * portefeuille en vente ne coûte rien.
 */
export async function hasContactSubscription(actor: Actor): Promise<boolean> {
  if (isAdmin(actor)) return true;
  const sub = await prisma.subscription.findFirst({
    where: { userId: actor.id, status: "ACTIVE", plan: "GROWTH" },
    select: { id: true },
  });
  return Boolean(sub);
}
