import type { DealStage } from "@prisma/client";
import { DEAL_STAGE_ORDER } from "@/lib/labels";

/**
 * Part du prix versée au trust : tout le prix, dépôt de positionnement déduit.
 * Les fonds sont libérés au cédant après contrôle et vérification de
 * l'ensemble des données.
 */
export const ESCROW_UPFRONT_SHARE = 1;

export type PipelineStep = {
  key: string;
  /** Numéro affiché, « 01 » à « 04 ». */
  num: string;
  label: string;
  summary: string;
};

/**
 * Les quatre étapes du modèle, identiques du tableau de bord à la fiche.
 *
 * Elles viennent de la dernière page du dossier de présentation : l'étude, la
 * mise en ligne, le positionnement, la signature. Un dossier n'a jamais deux
 * lectures différentes selon l'écran où on le regarde.
 */
export const SALE_PIPELINE: PipelineStep[] = [
  {
    key: "ETUDE",
    num: "01",
    label: "L’étude",
    summary:
      "Nous réalisons une étude du portefeuille afin de mettre en évidence ses différents éléments et caractéristiques.",
  },
  {
    key: "ONLINE",
    num: "02",
    label: "La mise en ligne",
    summary:
      "Une fois la valeur déterminée, l’annonce est mise en ligne avec le montant correspondant, sous un simple numéro de dossier.",
  },
  {
    key: "POSITION",
    num: "03",
    label: "Le positionnement",
    summary:
      "L’acquéreur se positionne. La procédure de cession démarre et l’identité du cédant lui est révélée.",
  },
  {
    key: "SIGNATURE",
    num: "04",
    label: "La signature",
    summary:
      "Contrats contrôlés par nos avocats, signature des deux parties, fonds libérés par le trust, puis transfert des contrats.",
  },
];

/**
 * Où se situe un dossier dans les quatre étapes.
 *
 * Tant qu'aucun dossier de cession n'existe, l'acquéreur est au
 * positionnement. Dès qu'il en existe un, quelle que soit son étape interne,
 * la signature est en cours : les étapes du tunnel sont des détails de
 * l'étape 04, pas des étapes de plus.
 */
export function pipelineIndex(stage: DealStage | "POSITION"): number {
  if (stage === "POSITION") return 2;
  return 3;
}

/** Part du parcours franchie avant le positionnement : étude et mise en ligne. */
export const PRE_DEAL_SHARE = 50;

/** Avancement d'un dossier sur les quatre étapes, en pourcentage. */
export function pipelineProgressPercent(stage: DealStage | "POSITION"): number {
  if (stage === "POSITION") return PRE_DEAL_SHARE;
  if (stage === "CLOSED") return 100;
  return 75;
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
        ? {
            title: "Transmettre les pièces du cabinet",
            body: "Kbis, statuts, justificatif ORIAS et codes courtier : notre équipe contrôle, puis les contrats sont préparés.",
          }
        : {
            title: "Examiner les pièces du cabinet",
            body: "Les pièces du cédant vous sont ouvertes depuis le versement du dépôt de positionnement.",
          };
    case "DEED":
    case "SIGNATURE":
      return {
        title: "Signer les contrats de cession",
        body: "Contrats contrôlés par nos avocats, signés en ligne par les deux parties.",
      };
    case "ESCROW":
    case "TRANSFER":
    case "RETENTION":
      return seller
        ? {
            title: "Attendre la libération des fonds",
            body: "Les fonds sont libérés par le trust après contrôle et vérification de l’ensemble des données, puis les contrats sont transférés.",
          }
        : {
            title: "Verser le montant au trust",
            body: "Le montant de l’annonce, dépôt de positionnement déduit, passe par le trust jusqu’au transfert des contrats.",
          };
    case "CLOSED":
      return {
        title: "Cession close",
        body: "Les contrats sont transférés et les fonds versés au cédant.",
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
