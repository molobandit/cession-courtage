/**
 * Source unique des tarifs. Toute valeur monetaire affichee doit venir d'ici,
 * jamais d'un nombre en dur dans une page.
 */

/** Option 1 : annonce simple, sans verification detaillee, sans commission. */
export const SIMPLE_FEE_RATE = 0;

/** Option 2 : portefeuille verifie, honoraires HT a la vente conclue. */
export const VERIFIED_FEE_RATE_MIN = 0.125;
export const VERIFIED_FEE_RATE_MAX = 0.15;

/**
 * Defaut des dossiers (borne basse de l'option 2).
 * Conservee pour le seed et les enregistrements existants.
 */
export const SUCCESS_FEE_RATE = VERIFIED_FEE_RATE_MIN;

export const SIMPLE_FEE_LABEL = "0 %";
export const VERIFIED_FEE_RANGE_LABEL = "12,5 à 15 % HT";

/** Depot pour reveler l'identite du vendeur. Rail Stripe sous 999 €, Trustap au-dela. Sans adaptateur actif : enregistrement sans debit. */
export const INTEREST_DEPOSIT_RATE = 0.025;
export const INTEREST_DEPOSIT_LABEL = "2,5 %";

/** Abonnement annuel obligatoire, HT, pour le detail de l'offre (contact, messages). */
export const GROWTH_PLAN_ANNUAL_EUR = 250;

/** TVA applicable a l'abonnement (prestation de services, France). */
export const VAT_RATE = 0.2;

/** Le forfait gratuit ne preleve pas d'honoraires differents : seul le contact change. */
export const FREE_PLAN_DEAL_QUOTA = 3;

/** Plancher d'honoraires, option 2 uniquement. */
export const SUCCESS_FEE_FLOOR_EUR = 900;

export type PlanKey = "FREE" | "GROWTH";

export type PlanDefinition = {
  key: PlanKey;
  label: string;
  annualPriceEur: number;
  dealQuota: number | null;
  successFeeRate: number;
};

export const PLANS: Record<PlanKey, PlanDefinition> = {
  FREE: {
    key: "FREE",
    label: "Sans frais",
    annualPriceEur: 0,
    dealQuota: FREE_PLAN_DEAL_QUOTA,
    successFeeRate: SIMPLE_FEE_RATE,
  },
  GROWTH: {
    key: "GROWTH",
    label: "Abonnement",
    annualPriceEur: GROWTH_PLAN_ANNUAL_EUR,
    dealQuota: null,
    successFeeRate: SUCCESS_FEE_RATE,
  },
};

export function percentHtLabel(rate: number): string {
  return `${(rate * 100).toLocaleString("fr-FR")} % HT`;
}

/** Montant TTC de l'abonnement annuel, arrondi au centime. */
export function growthPlanAnnualTtcEur(): number {
  return Math.round(GROWTH_PLAN_ANNUAL_EUR * (1 + VAT_RATE) * 100) / 100;
}

/** Montant TTC en centimes, pour Stripe. */
export function growthPlanAnnualTtcCents(): number {
  return Math.round(growthPlanAnnualTtcEur() * 100);
}

/** Montant du depot d'interet. Sans rail actif : enregistrement sans debit. */
export function interestDepositFor(askingPriceEur: number): number {
  if (!Number.isFinite(askingPriceEur) || askingPriceEur <= 0) return 0;
  return Math.round(askingPriceEur * INTEREST_DEPOSIT_RATE * 100) / 100;
}

/** Honoraires dus sur un prix de cession. Taux 0 = option 1, sans plancher. */
export function successFeeFor(
  salePriceEur: number,
  rate: number = SUCCESS_FEE_RATE,
): number {
  if (!Number.isFinite(salePriceEur) || salePriceEur <= 0) return 0;
  if (rate <= 0) return 0;
  const raw = salePriceEur * rate;
  const rounded = Math.round(raw * 100) / 100;
  return Math.max(SUCCESS_FEE_FLOOR_EUR, rounded);
}
