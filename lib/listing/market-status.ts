import type { ListingStatus } from "@prisma/client";

/**
 * Statut de cotation d'un portefeuille, dit de la même façon partout.
 *
 * Le site se présente comme une bourse : un titre y est ouvert, en séance
 * en séance, en négociation ou adjugé, et chacun lit l'état d'un coup d'œil.
 * Les pages disaient au contraire « Fenêtre close » sur une annonce qui recevait
 * encore des offres, « Clôture dans 15 jours » sur un portefeuille vendu, et
 * chaque écran avait ses propres mots. Tout passe désormais par ici.
 *
 * Fonctions pures, testables sans base.
 */

export type MarketTone = "open" | "sealed" | "negotiation" | "sold" | "off";

export type MarketStatus = {
  /** Étiquette courte, pour la pastille. */
  label: string;
  tone: MarketTone;
  /** Précision : le compte à rebours d'une séance scellée, ou ce qu'il se passe. */
  detail: string | null;
  /** Le portefeuille peut-il encore recevoir une prise de position ? */
  tradable: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function joursRestants(closesAt: Date | null, now: Date): number | null {
  if (!closesAt) return null;
  return Math.ceil((closesAt.getTime() - now.getTime()) / DAY_MS);
}

export function marketStatus(input: {
  status: ListingStatus;
  offerWindowClosesAt: Date | null;
  now?: Date;
}): MarketStatus {
  const now = input.now ?? new Date();
  switch (input.status) {
    case "DRAFT":
      return { label: "Brouillon", tone: "off", detail: "Non publié", tradable: false };
    case "PENDING_REVIEW":
      return { label: "En cours de cotation", tone: "off", detail: "Relecture par l’équipe avant publication", tradable: false };
    case "WITHDRAWN":
      return { label: "Retiré du marché", tone: "off", detail: null, tradable: false };
    case "SOLD":
      return { label: "Vendu", tone: "sold", detail: "Cession conclue", tradable: false };
    case "UNDER_NEGOTIATION":
      return {
        label: "En négociation",
        tone: "negotiation",
        detail: "Un acquéreur est en dossier exclusif",
        tradable: false,
      };
    default: {
      const jours = joursRestants(input.offerWindowClosesAt, now);
      if (input.status === "OFFERS_OPEN" && jours !== null && jours >= 0) {
        return {
          label: "Séance en cours",
          tone: "sealed",
          detail:
            jours === 0 ? "Clôture aujourd’hui" : jours === 1 ? "Clôture demain" : `Clôture dans ${jours} jours`,
          tradable: true,
        };
      }
      return {
        label: "Offres ouvertes",
        tone: "open",
        detail: "Le cédant peut retenir une offre",
        tradable: true,
      };
    }
  }
}

/** Libellé seul, pour les tableaux et les écrans d'administration. */
export const MARKET_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En cours de cotation",
  PUBLISHED: "Offres ouvertes",
  OFFERS_OPEN: "Séance en cours",
  OFFERS_CLOSED: "Offres ouvertes",
  UNDER_NEGOTIATION: "En négociation",
  SOLD: "Vendu",
  WITHDRAWN: "Retiré du marché",
};
