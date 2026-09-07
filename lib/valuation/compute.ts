import { CommissionType, DistributionMode, type RiskType } from "@prisma/client";
import { DEFAULT_MULTIPLES } from "@/lib/valuation/defaults";
import { hhi, round2, topShare } from "@/lib/valuation/metrics";
import {
  ADVANCED_COMMISSION_FACTOR,
  ALGORITHM_VERSION,
  RANGE_HIGH_FACTOR,
  RANGE_LOW_FACTOR,
  type ComputeValuationInput,
  type ValuationAdjustment,
  type ValuationBreakdown,
} from "@/lib/valuation/types";

export function resolveMultiple(
  riskType: RiskType,
  multiples: Partial<Record<RiskType, number>>,
): number {
  const value = multiples[riskType] ?? DEFAULT_MULTIPLES[riskType];
  if (value == null || !Number.isFinite(value) || value < 0) {
    throw new Error(`Multiple de valorisation manquant pour ${riskType}.`);
  }
  return value;
}

function carrierFactor(herfindahl: number): { label: string; factor: number } {
  if (herfindahl > 0.6) return { label: "Concentration compagnies (HHI > 0,60)", factor: 0.8 };
  if (herfindahl >= 0.3) return { label: "Concentration compagnies (HHI 0,30–0,60)", factor: 0.92 };
  return { label: "Concentration compagnies (HHI < 0,30)", factor: 1 };
}

function clientFactor(top10Share: number): { label: string; factor: number } {
  if (top10Share > 0.4) return { label: "Concentration clients (top 10 > 40 %)", factor: 0.85 };
  if (top10Share > 0.25) return { label: "Concentration clients (top 10 > 25 %)", factor: 0.93 };
  return { label: "Concentration clients (top 10 ≤ 25 %)", factor: 1 };
}

function ageFactor(averageAgeMonths: number): { label: string; factor: number } {
  if (averageAgeMonths > 72) return { label: "Ancienneté moyenne > 72 mois", factor: 1.15 };
  if (averageAgeMonths > 36) return { label: "Ancienneté moyenne > 36 mois", factor: 1.05 };
  if (averageAgeMonths < 12) return { label: "Ancienneté moyenne < 12 mois", factor: 0.88 };
  return { label: "Ancienneté moyenne 12–36 mois", factor: 1 };
}

function churnFactor(churnRate12m: number): { label: string; factor: number } {
  if (churnRate12m > 0.15) return { label: "Résiliation 12 mois > 15 %", factor: 0.7 };
  if (churnRate12m > 0.1) return { label: "Résiliation 12 mois > 10 %", factor: 0.85 };
  if (churnRate12m < 0.05) return { label: "Résiliation 12 mois < 5 %", factor: 1.1 };
  return { label: "Résiliation 12 mois 5–10 %", factor: 1 };
}

function distributionFactor(mode: DistributionMode): { label: string; factor: number } {
  if (mode === DistributionMode.REMOTE) return { label: "Distribution à distance", factor: 0.85 };
  if (mode === DistributionMode.AGENCY) return { label: "Distribution en agence", factor: 1.05 };
  return { label: "Distribution bureau / mixte", factor: 1 };
}

function supportFactor(months: number): { label: string; factor: number } {
  if (months >= 6) return { label: "Accompagnement cédant ≥ 6 mois", factor: 1.2 };
  if (months >= 3) return { label: "Accompagnement cédant 3 mois", factor: 1.1 };
  return { label: "Aucun accompagnement cédant", factor: 0.9 };
}

function complianceFactor(score: number): { label: string; factor: number } {
  if (score < 50) return { label: "Score de conformité < 50", factor: 0.75 };
  if (score < 80) return { label: "Score de conformité < 80", factor: 0.9 };
  return { label: "Score de conformité ≥ 80", factor: 1 };
}

function qualityScore(input: {
  herfindahl: number;
  top10Share: number;
  averageAgeMonths: number;
  churnRate12m: number;
  complianceScore: number;
}): number {
  let quality = 70;
  quality += input.herfindahl < 0.3 ? 10 : input.herfindahl > 0.6 ? -15 : 0;
  quality += input.top10Share <= 0.25 ? 8 : input.top10Share > 0.4 ? -10 : 0;
  quality += input.averageAgeMonths > 36 ? 6 : input.averageAgeMonths < 12 ? -8 : 0;
  quality += input.churnRate12m < 0.05 ? 8 : input.churnRate12m > 0.15 ? -15 : 0;
  quality += input.complianceScore >= 80 ? 6 : input.complianceScore < 50 ? -12 : 0;
  return Math.max(20, Math.min(98, Math.round(quality)));
}

/** Cascade valuation: gross (multiples) then sequential quality factors. Pure — no I/O. */
export function computeValuation(input: ComputeValuationInput): ValuationBreakdown {
  const { lines, firm, multiples } = input;
  const sellerSupportMonths = Math.max(0, input.sellerSupportMonths);
  const churnRate12m = Math.max(0, input.churnRate12m);
  const averageAgeMonths = Math.max(0, input.averageAgeMonths);

  let gross = 0;
  const carrierTotals = new Map<string, number>();
  const clientTotals = new Map<string, number>();
  let annualCommissions = 0;

  for (const line of lines) {
    const multiple = resolveMultiple(line.riskType, multiples);
    let value = line.annualCommission * multiple;
    if (line.commissionType === CommissionType.ADVANCED) value *= ADVANCED_COMMISSION_FACTOR;
    gross += value;
    carrierTotals.set(line.carrier, (carrierTotals.get(line.carrier) ?? 0) + line.annualCommission);
    clientTotals.set(line.clientKey, (clientTotals.get(line.clientKey) ?? 0) + line.annualCommission);
    annualCommissions += line.annualCommission;
  }

  const herfindahl =
    annualCommissions > 0
      ? hhi([...carrierTotals.values()].map((value) => value / annualCommissions))
      : 0;
  const top10ShareValue = topShare([...clientTotals.values()], 10, annualCommissions);

  const steps: { key: string; label: string; factor: number }[] = [
    { key: "carrier_hhi", ...carrierFactor(herfindahl) },
    { key: "client_conc", ...clientFactor(top10ShareValue) },
    { key: "age", ...ageFactor(averageAgeMonths) },
    { key: "churn", ...churnFactor(churnRate12m) },
    { key: "distribution", ...distributionFactor(firm.distributionMode) },
    { key: "support", ...supportFactor(sellerSupportMonths) },
    { key: "compliance", ...complianceFactor(firm.complianceScore) },
  ];

  const adjustments: ValuationAdjustment[] = [];
  let current = gross;
  for (const step of steps) {
    const before = current;
    current *= step.factor;
    adjustments.push({
      key: step.key,
      label: step.label,
      factor: step.factor,
      impactEur: round2(current - before),
    });
  }

  const midValue = current;
  const actions: ValuationBreakdown["actions"] = [];
  const hhiAdj = adjustments.find((a) => a.key === "carrier_hhi");
  if (hhiAdj && hhiAdj.factor < 1) {
    actions.push({
      title: "Diversifier les compagnies",
      detail: `Votre dépendance à un nombre restreint de compagnies coûte ${Math.abs(hhiAdj.impactEur).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € — élargir le panel remonterait la valorisation.`,
      impactEur: hhiAdj.impactEur,
    });
  }
  const clientAdj = adjustments.find((a) => a.key === "client_conc");
  if (clientAdj && clientAdj.factor < 1) {
    actions.push({
      title: "Réduire la concentration client",
      detail: `Les 10 premiers clients pèsent ${(top10ShareValue * 100).toFixed(0)} % des commissions. Étaler le risque relèverait la valeur de ${Math.abs(clientAdj.impactEur).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €.`,
      impactEur: clientAdj.impactEur,
    });
  }
  const churnAdj = adjustments.find((a) => a.key === "churn");
  if (churnAdj && churnAdj.factor < 1) {
    actions.push({
      title: "Maîtriser la résiliation",
      detail: `Un taux de chute à ${(churnRate12m * 100).toFixed(1)} % sur 12 mois pénalise la cession de ${Math.abs(churnAdj.impactEur).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €.`,
      impactEur: churnAdj.impactEur,
    });
  }
  const supportAdj = adjustments.find((a) => a.key === "support");
  if (supportAdj && supportAdj.factor < 1) {
    const uplift = round2(midValue * (1.2 / 0.9 - 1));
    actions.push({
      title: "Proposer un accompagnement",
      detail: `Un accompagnement de 6 mois relèverait la valorisation d'environ ${Math.round(uplift).toLocaleString("fr-FR")} €.`,
      impactEur: uplift,
    });
  }

  return {
    grossValue: round2(gross),
    adjustments,
    midValue: round2(midValue),
    lowValue: round2(midValue * RANGE_LOW_FACTOR),
    highValue: round2(midValue * RANGE_HIGH_FACTOR),
    qualityScore: qualityScore({
      herfindahl,
      top10Share: top10ShareValue,
      averageAgeMonths,
      churnRate12m,
      complianceScore: firm.complianceScore,
    }),
    actions,
    metrics: {
      herfindahl: round2(herfindahl * 10000) / 10000,
      top10Share: round2(top10ShareValue * 10000) / 10000,
      averageAgeMonths,
      churnRate12m,
      contractCount: lines.length,
      clientCount: clientTotals.size,
      annualCommissions: round2(annualCommissions),
    },
    algorithmVersion: ALGORITHM_VERSION,
  };
}
