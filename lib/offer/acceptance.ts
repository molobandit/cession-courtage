import type { ListingStatus } from "@prisma/client";

/**
 * Une annonce reçoit-elle encore des offres ?
 *
 * La fenêtre de 21 jours règle ce que le cédant voit, pas ce que l'acquéreur
 * peut faire. Tant qu'elle est ouverte les offres restent scellées ; une fois
 * close, une offre arrivée en retard est simplement visible tout de suite.
 * Fermer la porte à la clôture laissait l'acquéreur devant un bouton « Prendre
 * position » qui ne menait à rien, sur un portefeuille que personne n'avait
 * encore repris.
 *
 * Restent fermées : l'annonce en brouillon, retirée, vendue, et celle dont
 * tous les fournisseurs sont déjà engagés — c'est ce que signifie
 * UNDER_NEGOTIATION, posé seulement quand plus aucun lot n'est libre.
 */
export function listingAcceptsOffers(status: ListingStatus): boolean {
  return status === "PUBLISHED" || status === "OFFERS_OPEN" || status === "OFFERS_CLOSED";
}
