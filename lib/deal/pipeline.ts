import type { DealStage } from "@prisma/client";
import { DEAL_STAGE_ORDER } from "@/lib/labels";

/** Part du prix séquestrée à la signature, avant le solde de rétention. */
export const ESCROW_UPFRONT_SHARE = 0.8;

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
    summary: "Comptant au séquestre, attestations envoyées aux compagnies, contrats rattachés.",
  },
  {
    key: "RETENTION",
    label: "Solde",
    summary: "Conservation déclarée à douze mois et validée : séquestre et solde ajusté libérés.",
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
      return seller
        ? { title: "Envoyer les attestations aux compagnies", body: "Dès que le comptant (80 %) est au séquestre." }
        : { title: "Verser le comptant, puis confirmer le transfert", body: "80 % du prix au séquestre, puis confirmation du rattachement des contrats." };
    case "RETENTION":
      return seller
        ? { title: "Valider la déclaration de conservation", body: "Votre validation libère le séquestre et le solde ajusté." }
        : { title: "Déclarer la conservation à douze mois", body: "Contrats conservés et commissions encaissées : le solde de 20 % en dépend." };
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
