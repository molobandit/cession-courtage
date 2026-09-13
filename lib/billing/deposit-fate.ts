import { depositPaymentRail } from "@/lib/partners/catalog";

/**
 * Sort du dépôt de garantie.
 *
 * Le dépôt n'est pas un droit d'entrée : c'est un engagement. Il sert à
 * protéger le cédant contre une rétractation d'opportunité, une fois qu'il a
 * ouvert ses pièces et arrêté de chercher d'autres repreneurs.
 *
 * D'où deux issues, et deux seulement. La cession aboutit : le dépôt vient en
 * déduction du prix, il n'est jamais remboursé à part — ce serait un
 * mouvement d'argent inutile dans les deux sens. L'acquéreur se retire : le
 * dépôt reste au cédant, à titre indemnitaire, en réparation du temps et de
 * l'exclusivité qu'il a donnés.
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
  if (outcome === "DEDUCTED") return "Déduit du prix";
  if (outcome === "RETAINED") return "Conservé à titre indemnitaire";
  return "En attente d’issue";
}

/**
 * Les règles, telles qu'elles doivent être lues avant de verser.
 *
 * Écrites au futur et à la deuxième personne : celui qui les lit s'apprête à
 * s'engager, il n'est pas en train de consulter un règlement.
 */
export function depositTerms(amountLabel: string, amountEur?: number): string[] {
  const rail =
    typeof amountEur === "number" && Number.isFinite(amountEur)
      ? depositPaymentRail(amountEur)
      : null;
  const railLine =
    rail === "stripe"
      ? "Sous 999 euros, ce dépôt est conçu pour Stripe. Tant que ce rail n’est pas actif, l’engagement est enregistré sans débit."
      : rail === "trustap"
        ? "À partir de 999 euros, ce dépôt rejoint Trustap. Tant que le séquestre n’est pas actif, l’engagement est enregistré sans débit."
        : "Tant que Stripe ou Trustap n’est pas actif, cet engagement est enregistré sans débit.";
  return [
    `Vous versez ${amountLabel} pour vous positionner sur ce dossier.`,
    "Si la cession aboutit, ce montant vient en déduction du prix : il n’est pas remboursé à part.",
    "Si vous vous retirez, il reste acquis au cédant à titre indemnitaire.",
    "Tant que le dossier suit son cours, il n’est ni acquis ni rendu.",
    railLine,
  ];
}
