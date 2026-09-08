/**
 * Source unique des tarifs. Toute valeur monetaire affichee doit venir d'ici,
 * jamais d'un nombre en dur dans une page.
 */

/** Honoraires preleves uniquement a la vente conclue. */
export const SUCCESS_FEE_RATE = 0.08;

/** Abonnement acquereur, hors taxes, par an. */
export const GROWTH_PLAN_ANNUAL_EUR = 190;

/** Le forfait gratuit ne preleve pas d'honoraires differents : seul le quota change. */
export const FREE_PLAN_DEAL_QUOTA = 3;

/** Plancher d'honoraires : sous ce montant un dossier ne couvre pas son cout. */
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
    label: "Découverte",
    annualPriceEur: 0,
    dealQuota: FREE_PLAN_DEAL_QUOTA,
    successFeeRate: SUCCESS_FEE_RATE,
  },
  GROWTH: {
    key: "GROWTH",
    label: "Croissance",
    annualPriceEur: GROWTH_PLAN_ANNUAL_EUR,
    dealQuota: null,
    successFeeRate: SUCCESS_FEE_RATE,
  },
};

/** Honoraires dus sur un prix de cession, plancher applique. */
export function successFeeFor(salePriceEur: number): number {
  if (!Number.isFinite(salePriceEur) || salePriceEur <= 0) return 0;
  const raw = salePriceEur * SUCCESS_FEE_RATE;
  return Math.max(SUCCESS_FEE_FLOOR_EUR, Math.round(raw * 100) / 100);
}
