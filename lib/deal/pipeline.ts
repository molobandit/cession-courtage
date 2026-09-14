import type { DealStage } from "@prisma/client";
import { DEAL_STAGE_ORDER } from "@/lib/labels";

/**
 * Part du prix versée au séquestre : tout le prix, dépôt de garantie déduit.
 * Les fonds sont libérés au cédant après la signature et l'accord des
 * compagnies sur le transfert.
 */
export const ESCROW_UPFRONT_SHARE = 1;

export type PipelineStep = {
  key: string;
  label: string;
  summary: string;
};

/**
 * Parcours visible, du dépôt de candidature jusqu’à la clôture.
 * « Positionnement » n’est pas un DealStage Prisma : il précède l’acceptation.
 */
export const SALE_PIPELINE: PipelineStep[] = [
  {
    key: "POSITION",
    label: "Positionnement",
    summary: "Prise de position, engagement et offre, jusqu’à ce que le cédant la retienne.",
  },
  {
    key: "NDA",
    label: "Offre acceptée",
    summary: "Le cédant retient l’offre : elle vaut lettre d’intention, la confidentialité est acceptée des deux côtés.",
  },
  {
    key: "DATA_ROOM",
    label: "Vérifications",
    summary: "Pièces du cabinet examinées, prix confirmé, comptes vérifiés, codes courtier renseignés.",
  },
  {
    key: "SIGNATURE",
    label: "Signature",
    summary: "Protocole et attestations de transfert signés électroniquement par les deux parties.",
  },
  {
    key: "TRANSFER",
    label: "Paiement et transfert",
    summary: "Prix au séquestre, attestations envoyées, accord des compagnies : les fonds sont libérés au cédant.",
  },

  {
    key: "CLOSED",
    label: "Clôturé",
    summary: "Cession close. L’annonce passe en cédée.",
  },
];

/** Étapes de l'ancien parcours, affichées à l'étape qui les regroupe désormais. */
const REGROUPEES: Partial<Record<DealStage, DealStage>> = {
  LOI: "DATA_ROOM",
  KYC: "DATA_ROOM",
  DEED: "SIGNATURE",
  ESCROW: "TRANSFER",
  RETENTION: "TRANSFER",
};

export function pipelineIndex(stage: DealStage | "POSITION"): number {
  if (stage === "POSITION") return 0;
  const cle = REGROUPEES[stage] ?? stage;
  return SALE_PIPELINE.findIndex((step) => step.key === cle);
}

/** Part du parcours franchie avant l'offre retenue : position, dépôt, offre. */
export const PRE_DEAL_SHARE = 15;

/**
 * Avancement d'un dossier, sur la même échelle que la prise de position.
 *
 * Deux échelles coexistaient : le dossier de cession affichait 10 % à la
 * confidentialité quand la page de suivi du même dossier affichait 15 %. Une
 * seule règle désormais — la position vaut 3 %, l'offre retenue 15 %, la
 * clôture 100 % — pour que le chiffre soit le même partout.
 */
export function pipelineProgressPercent(stage: DealStage | "POSITION"): number {
  if (stage === "POSITION") return 3;
  const index = pipelineIndex(stage) - 1;
  const last = SALE_PIPELINE.length - 2;
  if (index < 0) return 0;
  if (index === 0) return PRE_DEAL_SHARE;
  return Math.round(PRE_DEAL_SHARE + (index / last) * (100 - PRE_DEAL_SHARE));
}

export type NextPipelineAction = {
  title: string;
  body: string;
};

export function nextPipelineAction(
  stage: DealStage,
  role: "seller" | "buyer",
): NextPipelineAction {
  const seller = role === "seller";
  switch (stage) {
    case "NDA":
    case "LOI":
    case "KYC":
    case "DATA_ROOM":
      return seller
        ? { title: "Préparer les vérifications", body: "Pièces du cabinet et codes courtier : l’acquéreur confirme ensuite son prix." }
        : { title: "Examiner les pièces et confirmer le prix", body: "Un geste après examen. Votre compte doit être vérifié, une fois pour toutes." };
    case "DEED":
    case "SIGNATURE":
      return {
        title: "Signer le protocole de cession",
        body: "Protocole et attestations de transfert, signés en un geste, horodatés.",
      };
    case "ESCROW":
    case "TRANSFER":
    case "RETENTION":
      return seller
        ? { title: "Envoyer les attestations aux compagnies", body: "Dès que le prix est au séquestre. Les fonds vous sont libérés à l’accord des compagnies." }
        : { title: "Verser le prix au séquestre, puis confirmer le transfert", body: "Le prix, dépôt déduit, reste au séquestre jusqu’à l’accord des compagnies." };
    case "CLOSED":
      return {
        title: "Cession close",
        body: "Le dossier est terminé. L’annonce est marquée cédée.",
      };
    default: {
      const _exhaustive: never = stage;
      return { title: String(_exhaustive), body: "" };
    }
  }
}

export function stageOrderIndex(stage: DealStage): number {
  return DEAL_STAGE_ORDER.indexOf(stage);
}
