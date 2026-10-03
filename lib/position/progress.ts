import type { DealStage, ListingStatus, OfferStatus } from "@prisma/client";
import { PRE_DEAL_SHARE, SALE_PIPELINE, pipelineIndex, pipelineProgressPercent } from "@/lib/deal/pipeline";

/**
 * Où en est une prise de position, vue par l'acquéreur ou par le cédant.
 *
 * Une seule lecture pour les deux parties et pour tous les écrans — la page du
 * dossier, les cartes du tableau de bord, les notifications — afin qu'un même
 * dossier n'affiche jamais deux avancements différents.
 *
 * Les quatre étapes du modèle servent de repère commun : l'étude et la mise en
 * ligne sont franchies dès qu'une annonce existe, le positionnement court
 * jusqu'au dépôt, la signature couvre tout le dossier de cession.
 *
 * Fonctions pures, testables sans base.
 */

export type PositionFacts = {
  hasDeposit: boolean;
  offerStatus: OfferStatus | null;
  dealStage: DealStage | null;
  listingStatus: ListingStatus;
};

export type PositionOutcome = "active" | "closed" | "lost" | "withdrawn";

export type PositionState = {
  key: "POSITION" | "DEPOSIT" | "OFFER" | DealStage | "LOST" | "WITHDRAWN";
  /** Titre court, affiché après « Dossier N° … — ». */
  title: string;
  percent: number;
  outcome: PositionOutcome;
  /** Qui doit agir maintenant. */
  waitingFor: "buyer" | "seller" | "both" | null;
  buyerMessage: string;
  sellerMessage: string;
};

export type PositionStep = { key: string; label: string };

/** Les quatre étapes affichées, identiques partout. */
export const POSITION_STEPS: PositionStep[] = SALE_PIPELINE.map((s) => ({
  key: s.key,
  label: s.label,
}));

function dealPercent(stage: DealStage): number {
  return pipelineProgressPercent(stage);
}

export function positionState(facts: PositionFacts): PositionState {
  if (facts.dealStage) {
    const stage = facts.dealStage;
    const libelle = SALE_PIPELINE[pipelineIndex(stage)]?.label ?? stage;
    if (stage === "CLOSED") {
      return {
        key: stage,
        title: "Cession close",
        percent: 100,
        outcome: "closed",
        waitingFor: null,
        buyerMessage: "Le portefeuille est à vous. Les contrats sont transférés et les fonds libérés.",
        sellerMessage: "La cession est close. Les fonds sont libérés par le trust et l’annonce est vendue.",
      };
    }
    const libelleCourant = SALE_PIPELINE[pipelineIndex(stage)]?.label ?? libelle;
    return {
      key: stage,
      title: libelleCourant,
      percent: dealPercent(stage),
      outcome: "active",
      waitingFor: "both",
      buyerMessage:
        stage === "DATA_ROOM" || stage === "NDA"
          ? "La procédure de cession est lancée. Les pièces du cabinet cédant vous sont ouvertes."
          : `Le dossier de cession avance : étape « ${libelleCourant} ».`,
      sellerMessage:
        stage === "DATA_ROOM" || stage === "NDA"
          ? "Un acquéreur s’est positionné. Complétez les pièces du cabinet et les codes courtier."
          : `Le dossier de cession avance : étape « ${libelleCourant} ».`,
    };
  }

  if (facts.offerStatus === "WITHDRAWN") {
    return {
      key: "WITHDRAWN",
      title: "Positionnement retiré",
      percent: PRE_DEAL_SHARE,
      outcome: "withdrawn",
      waitingFor: null,
      buyerMessage: "Vous vous êtes retiré de ce dossier.",
      sellerMessage: "L’acquéreur s’est retiré de ce dossier.",
    };
  }

  // Un confrère a été retenu, ou l'offre a été écartée : la course est finie pour ce candidat.
  const pris = facts.listingStatus === "UNDER_NEGOTIATION" || facts.listingStatus === "SOLD";
  if (facts.offerStatus === "DECLINED" || (pris && facts.offerStatus !== "ACCEPTED")) {
    return {
      key: "LOST",
      title: "Un acquéreur s’est positionné",
      percent: PRE_DEAL_SHARE,
      outcome: "lost",
      waitingFor: null,
      buyerMessage:
        "Un confrère s’est positionné le premier sur ce portefeuille. La salle de marché en présente d’autres.",
      sellerMessage: "Un autre acquéreur s’est positionné sur ce dossier.",
    };
  }

  if (facts.offerStatus === "SUBMITTED" || facts.offerStatus === "ACCEPTED") {
    return {
      key: "OFFER",
      title: "Le positionnement",
      percent: PRE_DEAL_SHARE,
      outcome: "active",
      waitingFor: "seller",
      buyerMessage: "Votre positionnement est transmis. Notre équipe ouvre la procédure de cession.",
      sellerMessage: "Un acquéreur s’est positionné sur votre portefeuille.",
    };
  }

  if (facts.hasDeposit) {
    return {
      key: "DEPOSIT",
      title: "Dépôt de positionnement versé",
      percent: PRE_DEAL_SHARE,
      outcome: "active",
      waitingFor: "buyer",
      buyerMessage: "La procédure de cession est lancée. Le nom du cabinet cédant et ses pièces vous sont ouverts.",
      sellerMessage: "L’acquéreur a versé son dépôt de positionnement : la procédure de cession est lancée.",
    };
  }

  return {
    key: "POSITION",
    title: "Le positionnement",
    percent: PRE_DEAL_SHARE,
    outcome: "active",
    waitingFor: "buyer",
    buyerMessage:
      "Vous suivez ce portefeuille et pouvez écrire au cédant. Versez le dépôt de positionnement pour lancer la procédure de cession.",
    sellerMessage: "Un acquéreur suit votre portefeuille. Il peut vous écrire ; son dépôt de positionnement suivra.",
  };
}

/** Index de l'étape courante parmi les quatre, -1 pour une issue hors parcours. */
export function positionStepIndex(state: PositionState): number {
  if (state.outcome === "lost" || state.outcome === "withdrawn") return -1;
  if (state.key === "POSITION" || state.key === "DEPOSIT" || state.key === "OFFER") return 2;
  return 3;
}
