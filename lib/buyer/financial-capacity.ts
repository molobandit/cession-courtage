/**
 * Capacité financière d'un acquéreur.
 *
 * Pure, donc testable sans base.
 *
 * Le site affirme publiquement que la capacité financière des acquéreurs est
 * vérifiée. Une affirmation commerciale doit pouvoir être prouvée : ce module
 * définit ce que « vérifiée » veut dire, qui l'a constaté et quand. Sans lui,
 * la phrase resterait une promesse invérifiable.
 *
 * La vérification porte sur une capacité DÉCLARÉE et CONTRÔLÉE par l'éditeur,
 * pièce à l'appui. Elle ne garantit pas la solvabilité au jour de la vente, et
 * les libellés ne doivent jamais le laisser croire.
 */

export type StatutCapacite = "NONE" | "DECLARED" | "VERIFIED" | "REJECTED";

export type Capacite = {
  montantEur: number | null;
  statut: StatutCapacite;
  verifieeLe: Date | null;
};

/** Seuil en dessous duquel une déclaration n'a pas de sens sur ce marché. */
export const CAPACITE_MINIMUM_EUR = 5_000;

/** Au-delà de cette ancienneté, le contrôle doit être refait. */
export const VALIDITE_MOIS = 12;

export function capaciteVerifiee(c: Capacite, maintenant = new Date()): boolean {
  if (c.statut !== "VERIFIED" || !c.verifieeLe) return false;
  return !controlePerime(c.verifieeLe, maintenant);
}

/**
 * Un contrôle vieux de plus d'un an ne vaut plus rien : la situation d'un
 * cabinet change, et afficher une vérification périmée serait trompeur.
 */
export function controlePerime(verifieeLe: Date, maintenant = new Date()): boolean {
  const limite = new Date(verifieeLe);
  limite.setMonth(limite.getMonth() + VALIDITE_MOIS);
  return maintenant.getTime() >= limite.getTime();
}

/** La capacité vérifiée couvre-t-elle le prix demandé ? */
export function couvreLePrix(c: Capacite, prixDemandeEur: number, maintenant = new Date()): boolean {
  if (!capaciteVerifiee(c, maintenant)) return false;
  return (c.montantEur ?? 0) >= prixDemandeEur;
}

/** Une déclaration est-elle recevable ? */
export function declarationRecevable(montantEur: number): boolean {
  return Number.isFinite(montantEur) && montantEur >= CAPACITE_MINIMUM_EUR;
}

/**
 * Libellé montré au cédant, à côté d'une offre.
 *
 * Il dit ce qui a été constaté, jamais ce qui est garanti : « capacité vérifiée »
 * et non « acquéreur solvable ».
 */
export function libelleCapacite(c: Capacite, maintenant = new Date()): string {
  if (capaciteVerifiee(c, maintenant)) return "Capacité financière vérifiée";
  if (c.statut === "VERIFIED") return "Vérification à renouveler";
  if (c.statut === "DECLARED") return "Capacité déclarée, contrôle en cours";
  if (c.statut === "REJECTED") return "Capacité non retenue";
  return "Capacité non déclarée";
}

/** Le cédant peut-il voir le montant ? Seulement une fois le contrôle fait. */
export function montantVisibleParLeCedant(c: Capacite, maintenant = new Date()): number | null {
  return capaciteVerifiee(c, maintenant) ? c.montantEur : null;
}

export type ModeFinancement = "CASH" | "CREDIT" | "BOTH";

export const MODES_FINANCEMENT: { value: ModeFinancement; label: string; piece: string }[] = [
  { value: "CREDIT", label: "Crédit bancaire", piece: "Accord de principe bancaire" },
  { value: "CASH", label: "Comptant", piece: "Attestation bancaire de disponibilité des fonds" },
  { value: "BOTH", label: "Comptant et crédit", piece: "Accord de principe bancaire et attestation de fonds" },
];

/**
 * Un acquéreur peut-il s'engager (dépôt, offre) pour ce montant ?
 *
 * Un accord de principe bancaire, ou pour un achat comptant une attestation de
 * fonds, est exigé avant tout engagement : le cédant qui ouvre ses pièces et
 * suspend sa recherche doit pouvoir compter sur un acquéreur qui peut payer.
 * La déclaration suffit pour s'engager ; le contrôle de l'éditeur ajoute la
 * mention « financement vérifié » que voit le cédant.
 */
export function financementPret(
  input: { capacite: Capacite; mode: string | null; justificatifDepose: boolean; montantVise: number },
  maintenant = new Date(),
): { ok: true } | { ok: false; raison: string } {
  const { capacite, mode, justificatifDepose, montantVise } = input;
  if (capacite.statut === "NONE" || !mode || capacite.montantEur === null) {
    return { ok: false, raison: "Déclarez votre capacité d’acquisition et déposez votre accord de principe bancaire, une seule fois, dans votre profil." };
  }
  if (!justificatifDepose) {
    return { ok: false, raison: "Déposez votre accord de principe bancaire (ou votre attestation de fonds) dans votre profil avant de vous engager." };
  }
  if (capacite.statut === "REJECTED") {
    return { ok: false, raison: "Votre justificatif de financement n’a pas été retenu. Déposez-en un nouveau depuis votre profil." };
  }
  if (capacite.statut === "VERIFIED" && capacite.verifieeLe && controlePerime(capacite.verifieeLe, maintenant)) {
    return { ok: false, raison: "Votre justificatif de financement a plus de douze mois : déposez-en un récent." };
  }
  if (capacite.montantEur < montantVise) {
    return {
      ok: false,
      raison: `Votre capacité déclarée (${Math.round(capacite.montantEur).toLocaleString("fr-FR")} €) ne couvre pas ce montant. Mettez-la à jour dans votre profil.`,
    };
  }
  return { ok: true };
}
