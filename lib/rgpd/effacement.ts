/**
 * Regle d'effacement d'un compte, article 17 du RGPD.
 *
 * Pure, donc testable sans base.
 *
 * L'effacement n'est pas absolu. L'article 17.3 reserve le cas ou le traitement
 * reste necessaire a l'execution d'un contrat ou a la defense d'un droit en
 * justice. Une cession de portefeuille en cours entre precisement dans ce cas :
 * effacer un cedant au milieu d'un sequestre priverait l'acquereur de sa
 * contrepartie et de toute preuve.
 *
 * On distingue donc deux temps. Tant qu'un dossier est ouvert, l'effacement est
 * differe et motive. Une fois les dossiers clos, l'identite est neutralisee et
 * seules subsistent les traces comptables et contractuelles, qui ne designent
 * plus personne.
 */

export type EtatDossier = { stage: string };

/** Un dossier encore ouvert bloque l'effacement immediat. */
export function dossiersBloquants(dossiers: EtatDossier[]): number {
  return dossiers.filter((d) => d.stage !== "CLOSED").length;
}

export function effacementPossible(dossiers: EtatDossier[]): boolean {
  return dossiersBloquants(dossiers) === 0;
}

export function motifDeRefus(nombre: number): string {
  const pluriel = nombre > 1;
  return (
    `Votre compte est engagé dans ${nombre} dossier${pluriel ? "s" : ""} en cours. ` +
    `Tant qu'${pluriel ? "ils ne sont pas clos" : "il n'est pas clos"}, la suppression est ` +
    "suspendue : l'article 17.3 du RGPD réserve les données nécessaires à l'exécution " +
    "d'un contrat et à la défense d'un droit. Clôturez ou retirez-vous du dossier, " +
    "puis renouvelez votre demande."
  );
}

/**
 * Valeurs de remplacement pour neutraliser une identite.
 *
 * L'e-mail et le numero ORIAS sont uniques et obligatoires en base : ils ne
 * peuvent pas etre vides, seulement rendus non signifiants. L'alias public est
 * conserve, car il sert de libelle a la contrepartie dans les dossiers deja
 * clos : le supprimer rendrait leur historique illisible sans rien proteger,
 * un alias ne designant personne.
 */
export function identiteNeutralisee(userId: string): {
  email: string;
  oriasNumber: string;
  fullName: null;
  phone: null;
  passwordHash: null;
} {
  const marque = `supprime+${userId}@compte-efface.invalid`;
  return {
    email: marque,
    oriasNumber: `EFFACE-${userId}`,
    fullName: null,
    phone: null,
    passwordHash: null,
  };
}
