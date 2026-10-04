/** Droits d’accès aux données identifiantes du cédant (pas aux assurés). */

/**
 * Le dépôt ne lève l'anonymat qu'une fois reçu par le trust.
 *
 * Un prélèvement SEPA en cours (PROCESSING) peut encore être rejeté ou
 * annulé : tant qu'il n'est pas PAID, l'acquéreur ne voit ni le nom du
 * cabinet ni ses pièces. Un dépôt RECORDED (sans paiement en ligne) ne compte
 * que sur un site où le paiement n'est pas branché, c'est à dire en
 * démonstration et en développement.
 */
export function depositReleasesIdentity(paymentStatus: string | null | undefined, paymentsLive: boolean): boolean {
  if (paymentStatus === "PAID") return true;
  return !paymentsLive && paymentStatus === "RECORDED";
}

export function canReadCedantIdentity(input: {
  isOwner: boolean;
  canBuy: boolean;
  subscribed: boolean;
  hasDeposit: boolean;
  isInvestor?: boolean;
}): boolean {
  if (input.isOwner) return true;
  if (input.isInvestor && input.hasDeposit) return true;
  return input.canBuy && input.subscribed && input.hasDeposit;
}
