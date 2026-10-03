import type { ListingStatus } from "@prisma/client";

/**
 * Statut d'un portefeuille en salle de marché, dit de la même façon partout.
 *
 * Trois états publics, et trois seulement : disponible, un acquéreur s'est
 * positionné, vendu. Le reste, les séances scellées, les fenêtres d'offres et
 * les compte à rebours, appartenait à un modèle d'enchères qui n'est plus le
 * nôtre : le montant est arrêté après l'étude, et on se positionne en versant
 * son dépôt.
 *
 * Fonctions pures, testables sans base.
 */

export type MarketTone = "open" | "sealed" | "negotiation" | "sold" | "off";

export type MarketStatus = {
  /** Étiquette courte, pour la pastille. */
  label: string;
  tone: MarketTone;
  /** Précision affichée sous l'étiquette, quand elle apprend quelque chose. */
  detail: string | null;
  /** Le portefeuille peut-il encore recevoir une prise de position ? */
  tradable: boolean;
};

export function marketStatus(input: {
  status: ListingStatus;
  offerWindowClosesAt?: Date | null;
  now?: Date;
}): MarketStatus {
  switch (input.status) {
    case "DRAFT":
      return { label: "Dossier à envoyer", tone: "off", detail: "Pas encore en ligne", tradable: false };
    case "PENDING_REVIEW":
      return {
        label: "Étude en cours",
        tone: "off",
        detail: "Notre équipe étudie le portefeuille et détermine la valeur",
        tradable: false,
      };
    case "WITHDRAWN":
      return { label: "Retiré du marché", tone: "off", detail: null, tradable: false };
    case "SOLD":
      return { label: "Vendu", tone: "sold", detail: "Cession conclue", tradable: false };
    case "UNDER_NEGOTIATION":
      return {
        label: "Acquéreur positionné",
        tone: "negotiation",
        detail: "Le dépôt de positionnement a été versé",
        tradable: false,
      };
    default:
      return {
        label: "Disponible",
        tone: "open",
        detail: "Montant arrêté après l’étude",
        tradable: true,
      };
  }
}

/** Libellé seul, pour les tableaux et les écrans d'administration. */
export const MARKET_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Dossier à envoyer",
  PENDING_REVIEW: "Étude en cours",
  PUBLISHED: "Disponible",
  OFFERS_OPEN: "Disponible",
  OFFERS_CLOSED: "Disponible",
  UNDER_NEGOTIATION: "Acquéreur positionné",
  SOLD: "Vendu",
  WITHDRAWN: "Retiré du marché",
};
