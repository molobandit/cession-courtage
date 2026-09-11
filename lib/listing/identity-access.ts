/** Droits d’accès aux données identifiantes du cédant (pas aux assurés). */

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
