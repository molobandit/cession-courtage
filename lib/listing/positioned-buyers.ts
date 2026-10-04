import { depositReleasesIdentity } from "@/lib/listing/identity-access";

/**
 * Qui est positionné sur une annonce, et combien.
 *
 * Une seule définition, pour tous les écrans du cédant.
 *
 * Le tableau de bord comptait les positions dont l'étape avait dépassé le
 * simple intérêt, ce qui incluait les offres de l'ancien modèle ; la page de
 * l'annonce comptait les dépôts posés, réglés ou non. Les deux affichaient
 * donc des chiffres différents pour la même annonce. Est positionné celui dont
 * le dépôt est reçu, et personne d'autre : c'est ce dépôt qui lance la
 * procédure de cession et qui lève l'anonymat.
 */

export type DepotLu = { paymentStatus?: string | null } | null | undefined;

/** Un acquéreur est positionné quand son dépôt est reçu, pas seulement posé. */
export function estPositionne(depot: DepotLu, paiementsActifs: boolean): boolean {
  return Boolean(depot) && depositReleasesIdentity(depot?.paymentStatus, paiementsActifs);
}

/** Les candidats positionnés d'une annonce, parmi ceux qui la suivent. */
export function candidatsPositionnes<T extends { deposit?: DepotLu }>(
  candidats: readonly T[],
  paiementsActifs: boolean,
): T[] {
  return candidats.filter((c) => estPositionne(c.deposit, paiementsActifs));
}

/**
 * Une annonce porte un acquéreur positionné dès qu'un dépôt est reçu.
 *
 * Le statut en base suit normalement, `placeDeposit` passant l'annonce en
 * négociation. On regarde quand même les deux : un statut resté en arrière ne
 * doit pas faire dire « Disponible » à une annonce qui ne l'est plus.
 */
export function annonceAvecPositionne(input: {
  status: string;
  candidatsPositionnes: number;
}): boolean {
  return input.status === "UNDER_NEGOTIATION" || input.candidatsPositionnes > 0;
}

/** Ce que le cédant lit sous le nombre, et ce qu'on appelle les autres. */
export const SUIVEURS_LABEL = "Acquéreurs qui suivent le dossier";
export const POSITIONNES_LABEL = "Acquéreurs positionnés";

/**
 * Quand le cédant voit le nom de l'acquéreur.
 *
 * Règle lue dans `presentDeal` et `identitiesRevealedFor` : le dépôt reçu lève
 * l'anonymat des deux côtés, et c'est aussi lui qui ouvre le dossier.
 */
export const NOM_ACQUEREUR_REGLE =
  "Son nom vous est communiqué dès que son dépôt de positionnement est reçu par le trust.";
