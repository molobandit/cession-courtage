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
    summary: "Candidature et échanges anonymes, jusqu’à ce que le cédant retienne une offre.",
  },
  {
    key: "NDA",
    label: "Confidentialité",
    summary: "Les deux parties signent l’accord de confidentialité.",
  },
  {
    key: "DATA_ROOM",
    label: "Salle de données",
    summary: "Le cédant dépose les pièces du bordereau, l’acquéreur les examine.",
  },
  {
    key: "LOI",
    label: "Lettre d’intention",
    summary: "L’acquéreur propose un prix ferme et une date d’effet, le cédant accepte ou refuse.",
  },
  {
    key: "KYC",
    label: "Conformité",
    summary: "Kbis, pièce d’identité et ORIAS de chaque cabinet, contrôlés par l’autre.",
  },
  {
    key: "DEED",
    label: "Protocole",
    summary: "Protocole rédigé depuis le dossier, codes courtier, approbation des deux parties.",
  },
  {
    key: "SIGNATURE",
    label: "Signature",
    summary: "Signature électronique du protocole par les deux représentants.",
  },
  {
    key: "ESCROW",
    label: "Séquestre 80 %",
    summary: "L’acquéreur verse le comptant sur le compte séquestre.",
  },
  {
    key: "TRANSFER",
    label: "Transfert",
    summary: "Attestations signées adressées à chaque compagnie, rattachement confirmé par l’acquéreur.",
  },
  {
    key: "RETENTION",
    label: "Conservation et solde",
    summary: "Déclaration à douze mois validée par le cédant : séquestre et solde ajusté libérés.",
  },
  {
    key: "CLOSED",
    label: "Clôturé",
    summary: "Cession close. L’annonce passe en cédée.",
  },
];

export function pipelineIndex(stage: DealStage | "POSITION"): number {
  if (stage === "POSITION") return 0;
  return SALE_PIPELINE.findIndex((step) => step.key === stage);
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
      return {
        title: "Signer l’accord de confidentialité",
        body: "Les deux parties signent ; la salle de données s’ouvre avec la seconde signature.",
      };
    case "DATA_ROOM":
      return seller
        ? { title: "Déposer les pièces du bordereau", body: "Un fichier par ligne obligatoire. L’acquéreur les examine ensuite." }
        : { title: "Examiner la salle de données", body: "Consultez les pièces déposées, puis validez l’examen pour proposer votre lettre d’intention." };
    case "LOI":
      return seller
        ? { title: "Répondre à la lettre d’intention", body: "Acceptez-la pour figer le prix, ou refusez-la avec un motif." }
        : { title: "Proposer la lettre d’intention", body: "Prix ferme, date d’effet et conditions particulières." };
    case "KYC":
      return {
        title: "Déposer et contrôler les pièces d’identification",
        body: "Kbis, pièce d’identité du représentant et ORIAS ; chaque partie contrôle celles de l’autre.",
      };
    case "DEED":
      return {
        title: seller ? "Compléter et approuver le protocole" : "Relire et approuver le protocole",
        body: seller ? "Codes courtier par compagnie, puis approbation du texte." : "Le protocole est rédigé depuis le dossier : relisez-le et approuvez-le.",
      };
    case "SIGNATURE":
      return {
        title: "Signer le protocole de cession",
        body: "Signature électronique horodatée, liée à l’empreinte du texte approuvé.",
      };
    case "ESCROW":
      return seller
        ? { title: "En attente du séquestre", body: "L’acquéreur verse le comptant (80 %) sur le compte séquestre." }
        : { title: "Verser le comptant au séquestre", body: "80 % du prix, bloqués jusqu’à la clôture." };
    case "TRANSFER":
      return seller
        ? { title: "Déposer les attestations de transfert", body: "Une attestation signée par compagnie, adressée à la compagnie." }
        : { title: "Confirmer le rattachement des contrats", body: "Quand les compagnies ont basculé les contrats sur votre code." };
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
