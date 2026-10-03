import "server-only";
import type { Actor } from "@/lib/authz/actor";

/**
 * Accès au détail d'une annonce : contact, messages, dépôt de positionnement.
 *
 * Il n'y a plus d'abonnement : les deux dossiers de référence n'en prévoient
 * aucun, et le modèle ne fait payer qu'à la vente conclue. La fonction est
 * conservée parce qu'elle est appelée partout où l'accès se décide ; elle dit
 * désormais oui, et le mur d'abonnement a disparu des écrans.
 *
 * La table `Subscription` reste en base : les abonnements déjà réglés doivent
 * rester lisibles, et aucune migration n'est perdue.
 */
export async function hasContactSubscription(_actor: Actor): Promise<boolean> {
  return true;
}
