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
    summary: "Accord de confidentialité. Aucune raison sociale avant cet engagement, hors dépôt de 2,5 %.",
  },
  {
    key: "DATA_ROOM",
    label: "Salle de données",
    summary: "Pièces du cabinet et bordereau de vérification, hors donnée nominative d’assuré.",
  },
  {
    key: "LOI",
    label: "Accord de prix",
    summary: "Lettre d’intention : prix, comptant et différé. Les identités peuvent s’ouvrir.",
  },
  {
    key: "KYC",
    label: "Conformité",
    summary: "Vérification KYC / KYB des parties avant l’acte.",
  },
  {
    key: "DEED",
    label: "Kit contractuel",
    summary: "Protocole de cession, attestations, conditions de transfert des codes.",
  },
  {
    key: "SIGNATURE",
    label: "Signature",
    summary: "Signature de l’acte. Le séquestre peut alors recevoir les fonds.",
  },
  {
    key: "ESCROW",
    label: "Séquestre 80 %",
    summary: "Le comptant (80 % du prix convenu) est séquestré, puis le transfert peut commencer.",
  },
  {
    key: "TRANSFER",
    label: "Transfert",
    summary: "Information des compagnies, transfert de fichier et formalités ORIAS.",
  },
  {
    key: "RETENTION",
    label: "Vérification et solde",
    summary: "Contrôle de conservation du portefeuille, puis libération du solde (20 %).",
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

export function pipelineProgressPercent(stage: DealStage | "POSITION"): number {
  const index = pipelineIndex(stage);
  if (index < 0) return 0;
  const last = SALE_PIPELINE.length - 1;
  return Math.round((index / last) * 100);
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
        body: seller
          ? "Les deux parties confirment l’engagement de confidentialité pour ouvrir la salle de données."
          : "Acceptez l’accord pour accéder aux pièces, hors noms d’assurés.",
      };
    case "DATA_ROOM":
      return {
        title: seller ? "Déposer les pièces et préparer la LOI" : "Consulter la salle de données",
        body: "Quand les pièces utiles sont là, signez la lettre d’intention pour figer le prix.",
      };
    case "LOI":
      return {
        title: "Lancer la vérification de conformité",
        body: "KYC / KYB des cabinets avant de rédiger l’acte.",
      };
    case "KYC":
      return {
        title: "Terminer la conformité",
        body: "Une fois la vérification enregistrée, le kit contractuel s’ouvre.",
      };
    case "DEED":
      return {
        title: "Valider le protocole de cession",
        body: "L’acte, les attestations et les conditions de transfert des codes.",
      };
    case "SIGNATURE":
      return {
        title: "Confirmer la signature de l’acte",
        body: "Ensuite, 80 % du prix convenu partent au séquestre.",
      };
    case "ESCROW":
      return {
        title: "Séquestrer 80 % du prix",
        body: "Le comptant est bloqué. Le solde de 20 % reste jusqu’à la vérification de conservation.",
      };
    case "TRANSFER":
      return {
        title: "Confirmer le transfert ORIAS et compagnies",
        body: "Fichier clients (anonymisé ici), codes et immatriculation : la cession devient opérationnelle.",
      };
    case "RETENTION":
      return {
        title: "Déclarer la conservation, puis clôturer",
        body: "Cible 90 %. Le différé (20 %) peut être ajusté, puis libéré à la clôture.",
      };
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
