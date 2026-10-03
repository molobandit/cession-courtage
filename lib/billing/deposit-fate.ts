
/**
 * Sort du dépôt de positionnement.
 *
 * Le dépôt n'est pas un droit d'entrée : c'est un engagement. Il sert à
 * protéger le cédant contre une rétractation d'opportunité, une fois qu'il a
 * ouvert ses pièces et arrêté de chercher d'autres repreneurs.
 *
 * Quand la cession aboutit, le dépôt vient en déduction du montant : il n'est
 * jamais remboursé à part, ce serait un mouvement d'argent inutile dans les
 * deux sens. Le sort du dépôt en cas de retrait de l'acquéreur n'est pas
 * tranché : le code le calcule, l'interface ne l'annonce pas.
 *
 * Ces règles doivent être dites avant le versement, pas découvertes après :
 * `depositTerms` existe pour être affiché au moment où l'on s'engage.
 *
 * Fonctions pures, testables sans base.
 */

export type DepositOutcome = "PENDING" | "DEDUCTED" | "RETAINED";

/**
 * Ce que devient le dépôt, au vu de l'issue du dossier.
 *
 * Tant que rien n'est tranché il reste en attente : un dépôt n'est ni acquis
 * ni rendu pendant que la cession suit son cours.
 */
export function depositOutcome(input: {
  dealClosed: boolean;
  buyerWithdrew: boolean;
}): DepositOutcome {
  // Une cession close l'emporte sur tout : le dépôt a joué son rôle.
  if (input.dealClosed) return "DEDUCTED";
  if (input.buyerWithdrew) return "RETAINED";
  return "PENDING";
}

/**
 * Ce qu'il reste à verser au séquestre, une fois le dépôt imputé.
 *
 * Le dépôt fait partie du prix, il ne s'y ajoute pas. L'oublier ferait payer
 * deux fois la même somme à l'acquéreur.
 */
export function escrowAmountAfterDeposit(upfrontAmount: number, deposit: number): number {
  if (!Number.isFinite(upfrontAmount) || upfrontAmount <= 0) return 0;
  const impute = Number.isFinite(deposit) && deposit > 0 ? deposit : 0;
  return Math.round(Math.max(upfrontAmount - impute, 0) * 100) / 100;
}

/** Le dépôt couvre-t-il déjà tout le comptant ? Rare, mais possible sur un petit lot. */
export function depositCoversUpfront(upfrontAmount: number, deposit: number): boolean {
  return escrowAmountAfterDeposit(upfrontAmount, deposit) === 0 && upfrontAmount > 0;
}

/** Libellé de l'issue, pour les écrans et les courriels. */
export function depositOutcomeLabel(outcome: DepositOutcome): string {
  if (outcome === "DEDUCTED") return "Déduit de la transaction";
  if (outcome === "RETAINED") return "Conservé à titre indemnitaire";
  return "En attente d’issue";
}

/**
 * Les règles, telles qu'elles doivent être lues avant de verser.
 *
 * Écrites au futur et à la deuxième personne : celui qui les lit s'apprête à
 * s'engager, il n'est pas en train de consulter un règlement.
 */
export function depositTerms(amountLabel: string, _amountEur?: number): string[] {
  return [
    `Vous versez ${amountLabel} dans un trust. C’est ce dépôt qui lance la procédure de cession.`,
    "Le nom du cabinet cédant vous est révélé et ses pièces s’ouvrent.",
    "Si la cession aboutit, ce montant vient en déduction de la transaction : il n’est pas remboursé à part.",
    "Règlement par carte ou prélèvement SEPA, par un prestataire agréé : la plateforme ne détient jamais les fonds.",
  ];
}
