/**
 * Bordereau des pieces reclamees en verification prealable.
 *
 * Les acquereurs francais demandent systematiquement quatre familles de pieces.
 * Une base clientele mal documentee est le deuxieme motif d'echec d'une cession,
 * apres le refus des compagnies : preparer ce bordereau raccourcit la
 * negociation au lieu de la subir.
 */

export type DueDiligenceCategory = "LEGAL" | "FINANCIAL" | "PORTFOLIO" | "OPERATIONAL";

export const CATEGORY_LABELS: Record<DueDiligenceCategory, string> = {
  LEGAL: "Juridique",
  FINANCIAL: "Financier",
  PORTFOLIO: "Portefeuille",
  OPERATIONAL: "Opérationnel",
};

export const CATEGORY_ORDER: DueDiligenceCategory[] = [
  "LEGAL",
  "FINANCIAL",
  "PORTFOLIO",
  "OPERATIONAL",
];

export type ChecklistEntry = {
  category: DueDiligenceCategory;
  label: string;
  detail: string;
  required: boolean;
};

/** Socle demande sur toute cession, quelle que soit la composition. */
const BASE_CHECKLIST: ChecklistEntry[] = [
  {
    category: "LEGAL",
    label: "Statuts à jour",
    detail: "Version en vigueur, avec les derniers procès-verbaux d’assemblée.",
    required: true,
  },
  {
    category: "LEGAL",
    label: "Attestation ORIAS en cours de validité",
    detail: "L’immatriculation du cédant doit être valide à la date de la signature.",
    required: true,
  },
  {
    category: "LEGAL",
    label: "Conventions de courtage signées",
    detail: "Une convention par compagnie. C’est elle qui encadre le transfert du code.",
    required: true,
  },
  {
    category: "LEGAL",
    label: "Attestation de responsabilité civile professionnelle",
    detail: "En cours de validité, avec le montant de garantie.",
    required: true,
  },
  {
    category: "FINANCIAL",
    label: "Liasses fiscales des trois derniers exercices",
    detail: "Bilan et compte de résultat, tels que déposés.",
    required: true,
  },
  {
    category: "FINANCIAL",
    label: "Comptes intermédiaires",
    detail: "Situation comptable arrêtée à la date la plus récente.",
    required: true,
  },
  {
    category: "FINANCIAL",
    label: "Justification du résultat retraité",
    detail: "Retraitements de rémunération du dirigeant et de charges non récurrentes.",
    required: false,
  },
  {
    category: "PORTFOLIO",
    label: "Liste complète des contrats",
    detail: "Sans donnée nominative de client final : le bordereau importé fait foi.",
    required: true,
  },
  {
    category: "PORTFOLIO",
    label: "Commissions par compagnie",
    detail: "Sur les trois derniers exercices, pour objectiver la récurrence.",
    required: true,
  },
  {
    category: "PORTFOLIO",
    label: "Taux de renouvellement et de résiliation",
    detail: "Sur douze mois glissants, par branche si possible.",
    required: true,
  },
  {
    category: "PORTFOLIO",
    label: "Historique de sinistralité agrégé",
    detail: "Par branche, sans identification des assurés.",
    required: false,
  },
  {
    category: "OPERATIONAL",
    label: "Procédures de lutte contre le blanchiment",
    detail: "Dispositif LCB-FT, cartographie des risques, formation des collaborateurs.",
    required: true,
  },
  {
    category: "OPERATIONAL",
    label: "Conformité à la directive distribution",
    detail: "Devoir de conseil, formalisation des recommandations, formation continue.",
    required: true,
  },
  {
    category: "OPERATIONAL",
    label: "Registre des traitements de données",
    detail: "Registre RGPD et politique de conservation.",
    required: true,
  },
  {
    category: "OPERATIONAL",
    label: "Contrats informatiques et licences",
    detail: "Logiciel de gestion, extranet, accès conservés après la cession.",
    required: false,
  },
];

/**
 * Bordereau adapte a la composition du portefeuille.
 *
 * @param carriers compagnies presentes, pour exiger une convention par compagnie
 * @param hasDecennial vrai si le portefeuille comporte de la decennale
 */
export function buildChecklist(
  carriers: string[],
  hasDecennial: boolean,
): ChecklistEntry[] {
  const entries = [...BASE_CHECKLIST];

  // Une convention par compagnie : c'est cette piece qui conditionne le transfert du code.
  for (const carrier of [...new Set(carriers)].sort()) {
    entries.push({
      category: "LEGAL",
      label: `Convention de courtage ${carrier}`,
      detail: `Convention signée avec ${carrier}, et courrier d’information du transfert.`,
      required: true,
    });
  }

  if (hasDecennial) {
    entries.push({
      category: "OPERATIONAL",
      label: "Suivi des garanties décennales",
      detail:
        "La décennale engage sur dix ans : l’acquéreur vérifiera la reprise du passif.",
      required: true,
    });
  }

  return entries;
}

export type ChecklistProgress = {
  total: number;
  provided: number;
  requiredTotal: number;
  requiredProvided: number;
  /** Avancement sur les pieces obligatoires, entre 0 et 1. */
  share: number;
  complete: boolean;
};

export function checklistProgress(
  items: { required: boolean; providedAt: Date | null }[],
): ChecklistProgress {
  const requiredItems = items.filter((i) => i.required);
  const requiredProvided = requiredItems.filter((i) => i.providedAt !== null).length;
  return {
    total: items.length,
    provided: items.filter((i) => i.providedAt !== null).length,
    requiredTotal: requiredItems.length,
    requiredProvided,
    share: requiredItems.length > 0 ? requiredProvided / requiredItems.length : 1,
    complete: requiredItems.length > 0 && requiredProvided === requiredItems.length,
  };
}
