export const COMPANY_DOC_KINDS = [
  { kind: "KBIS", label: "Extrait Kbis de moins de 3 mois" },
  { kind: "ORIAS", label: "Attestation d’immatriculation ORIAS" },
  { kind: "RC_PRO", label: "Attestation d’assurance RC professionnelle" },
  { kind: "PRESENTATION", label: "Présentation du cabinet" },
  { kind: "STATUTS", label: "Statuts de la société" },
  { kind: "ORG", label: "Organigramme" },
  { kind: "DDA", label: "Attestation de formation DDA" },
  { kind: "LCB_FT", label: "Procédure LCB-FT" },
  { kind: "BAIL", label: "Bail ou justificatif des locaux" },
  { kind: "LIASSES", label: "Liasses fiscales des trois derniers exercices" },
  { kind: "COMMISSIONS", label: "Bordereaux de commissions des douze derniers mois" },
  { kind: "CONVENTIONS", label: "Conventions de courtage avec les compagnies" },
] as const;

/**
 * Pièces sans lesquelles un acquéreur ne confirme pas son prix.
 *
 * Déposées une fois sur l'annonce, elles alimentent la salle de données de
 * chaque dossier ouvert sur cette annonce : le cédant prépare sa vente avant
 * qu'elle ne commence, et la vérification ne l'attend pas.
 */
export const DATA_ROOM_KINDS = ["STATUTS", "LIASSES", "COMMISSIONS", "CONVENTIONS"] as const;

export type CompanyDocKind = (typeof COMPANY_DOC_KINDS)[number]["kind"];

export type CompanyDocRow = {
  id: string;
  listingId: string;
  kind: string;
  fileName: string;
  storageKey: string;
  createdAt: string;
};

export function companyDocLabel(kind: string): string {
  return COMPANY_DOC_KINDS.find((item) => item.kind === kind)?.label ?? "Pièce cabinet";
}
