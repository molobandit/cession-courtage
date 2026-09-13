import type { DealStage, ListingStatus, OfferStatus } from "@prisma/client";
import { SALE_PIPELINE, pipelineIndex } from "@/lib/deal/pipeline";

/**
 * Où en est une prise de position, vue par l'acquéreur ou par le cédant.
 *
 * Une seule lecture pour les deux parties et pour tous les écrans — la page du
 * dossier, les cartes du tableau de bord, les notifications — afin qu'un même
 * dossier n'affiche jamais deux avancements différents.
 *
 * Avant l'acceptation, trois marches : la position, le dépôt, l'offre. Elles
 * pèsent peu (15 %) : l'essentiel du chemin reste à parcourir une fois l'offre
 * retenue. Ensuite, le dossier suit le tunnel de cession jusqu'à la clôture.
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

export const PRE_DEAL_STEPS: PositionStep[] = [
  { key: "POSITION", label: "Prise de position" },
  { key: "DEPOSIT", label: "Dépôt de garantie" },
  { key: "OFFER", label: "Offre déposée" },
];

/** Toutes les étapes, de la position à la clôture, pour la frise du dossier. */
export const POSITION_STEPS: PositionStep[] = [
  ...PRE_DEAL_STEPS,
  ...SALE_PIPELINE.filter((s) => s.key !== "POSITION").map((s) => ({
    key: s.key,
    label: s.key === "NDA" ? "Offre retenue · confidentialité" : s.label,
  })),
];

const PRE_DEAL_SHARE = 15;

function dealPercent(stage: DealStage): number {
  // La frise du tunnel commence par « Positionnement » : le dossier part de NDA.
  const index = pipelineIndex(stage) - 1;
  const last = SALE_PIPELINE.length - 2;
  if (index <= 0) return PRE_DEAL_SHARE;
  return Math.round(PRE_DEAL_SHARE + (index / last) * (100 - PRE_DEAL_SHARE));
}

export function positionState(facts: PositionFacts): PositionState {
  if (facts.dealStage) {
    const stage = facts.dealStage;
    const libelle = SALE_PIPELINE.find((s) => s.key === stage)?.label ?? stage;
    if (stage === "CLOSED") {
      return {
        key: stage,
        title: "Cession close",
        percent: 100,
        outcome: "closed",
        waitingFor: null,
        buyerMessage: "Le portefeuille est à vous. Le dossier est clos, les fonds libérés.",
        sellerMessage: "La cession est close. Les fonds sont libérés et l’annonce est cédée.",
      };
    }
    return {
      key: stage,
      title: stage === "NDA" ? "Offre retenue" : libelle,
      percent: dealPercent(stage),
      outcome: "active",
      waitingFor: "both",
      buyerMessage:
        stage === "NDA"
          ? "Le cédant a retenu votre offre. Signez l’accord de confidentialité pour ouvrir la salle de données."
          : `Le dossier de cession avance : étape « ${libelle} ».`,
      sellerMessage:
        stage === "NDA"
          ? "Vous avez retenu cette offre. L’acquéreur signe la confidentialité, puis la salle de données s’ouvre."
          : `Le dossier de cession avance : étape « ${libelle} ».`,
    };
  }

  if (facts.offerStatus === "WITHDRAWN") {
    return {
      key: "WITHDRAWN",
      title: "Offre retirée",
      percent: 10,
      outcome: "withdrawn",
      waitingFor: null,
      buyerMessage: "Vous avez retiré votre offre. Le dépôt reste acquis au cédant.",
      sellerMessage: "L’acquéreur a retiré son offre. Son dépôt vous reste acquis.",
    };
  }

  // Un confrère a été retenu, ou l'offre a été écartée : la course est finie pour ce candidat.
  const pris = facts.listingStatus === "UNDER_NEGOTIATION" || facts.listingStatus === "SOLD";
  if (facts.offerStatus === "DECLINED" || (pris && facts.offerStatus !== "ACCEPTED")) {
    return {
      key: "LOST",
      title: "Le dossier est en négociation",
      percent: 3,
      outcome: "lost",
      waitingFor: null,
      buyerMessage:
        "Trop tard pour ce portefeuille : le cédant est entré en négociation avec un confrère. Bonne chance pour les prochaines opportunités.",
      sellerMessage: "Vous avez retenu un autre acquéreur.",
    };
  }

  if (facts.offerStatus === "SUBMITTED" || facts.offerStatus === "ACCEPTED") {
    return {
      key: "OFFER",
      title: "Offre déposée",
      percent: 12,
      outcome: "active",
      waitingFor: "seller",
      buyerMessage: "Votre offre est transmise. Le cédant compare les propositions et vous répond ici.",
      sellerMessage: "Une offre attend votre décision. Retenez-la pour ouvrir le dossier de cession.",
    };
  }

  if (facts.hasDeposit) {
    return {
      key: "DEPOSIT",
      title: "Dépôt de garantie versé",
      percent: 8,
      outcome: "active",
      waitingFor: "buyer",
      buyerMessage: "Les coordonnées sont ouvertes. Déposez votre offre pour vous engager sur le prix.",
      sellerMessage: "L’acquéreur a versé son dépôt : vos coordonnées lui sont ouvertes. Son offre suit.",
    };
  }

  return {
    key: "POSITION",
    title: "Position prise",
    percent: 3,
    outcome: "active",
    waitingFor: "buyer",
    buyerMessage:
      "Vous suivez ce portefeuille et pouvez écrire au cédant. Versez le dépôt de garantie pour ouvrir ses coordonnées et déposer une offre.",
    sellerMessage: "Un acquéreur s’intéresse à votre portefeuille. Il peut vous écrire ; son dépôt et son offre suivront.",
  };
}

/** Index de l'étape courante dans la frise, -1 pour une issue hors parcours. */
export function positionStepIndex(state: PositionState): number {
  return POSITION_STEPS.findIndex((s) => s.key === state.key);
}
