import { formatEuroWhole } from "@/lib/format/number";

export type PortfolioQuality = {
  commissionsYear1: number | null;
  commissionsYear2: number | null;
  commissionsYear3: number | null;
  recurrentCommissionShare: number | null;
  managedAnnualPremium: number | null;
};

export function qualityFromPortfolio(row: {
  commissionsYear1?: { toString(): string } | number | null;
  commissionsYear2?: { toString(): string } | number | null;
  commissionsYear3?: { toString(): string } | number | null;
  recurrentCommissionShare?: { toString(): string } | number | null;
  managedAnnualPremium?: { toString(): string } | number | null;
}): PortfolioQuality {
  const num = (value: { toString(): string } | number | null | undefined) => {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  return {
    commissionsYear1: num(row.commissionsYear1),
    commissionsYear2: num(row.commissionsYear2),
    commissionsYear3: num(row.commissionsYear3),
    recurrentCommissionShare: num(row.recurrentCommissionShare),
    managedAnnualPremium: num(row.managedAnnualPremium),
  };
}

export function hasQualityFigures(q: PortfolioQuality): boolean {
  return (
    q.commissionsYear1 != null ||
    q.commissionsYear2 != null ||
    q.commissionsYear3 != null ||
    q.recurrentCommissionShare != null ||
    q.managedAnnualPremium != null
  );
}

export function qualityFactRows(q: PortfolioQuality): { label: string; value: string }[] {
  const years = [
    { label: "Commissions, exercice N-2", value: q.commissionsYear1 },
    { label: "Commissions, exercice N-1", value: q.commissionsYear2 },
    { label: "Commissions, dernier exercice", value: q.commissionsYear3 },
  ]
    .filter((row) => row.value != null)
    .map((row) => ({ label: row.label, value: formatEuroWhole(row.value as number) }));

  const extra: { label: string; value: string }[] = [];
  if (q.recurrentCommissionShare != null) {
    extra.push({
      label: "Part du récurrent",
      value: `${Math.round(q.recurrentCommissionShare * 100)} % des commissions`,
    });
  }
  if (q.managedAnnualPremium != null) {
    extra.push({
      label: "Prime annuelle gérée",
      value: formatEuroWhole(q.managedAnnualPremium),
    });
  }
  return [...years, ...extra];
}

export function decimalOrNull(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toFixed(4);
}

export function moneyOrNull(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toFixed(2);
}
