import { CommissionType } from "@prisma/client";
import { RISK_TYPE_LABELS } from "@/lib/labels";
import { breakdownBy, type AnalyticsLine, type Share } from "@/lib/portfolio/analytics";

/**
 * Dossier d’étude / estimation, anonymisé.
 *
 * Livrable quand un cédant demande une estimation en ligne : chiffres du
 * bordereau, anatomie, fourchette de la cascade. Jamais la raison sociale,
 * ni un contact, ni un SIREN.
 */
export type ValuationStudy = {
  publicNumber: number | null;
  issuedAt: Date;
  dataCutoff: Date;
  zone: string;
  headline: string;
  contractCount: number;
  annualCommissions: number;
  monthlyCommissions: number;
  carrierCount: number;
  topCarrier: { name: string; share: number } | null;
  byBranch: Share[];
  byCarrier: Share[];
  averageCommissionPerContract: number;
  advancedCommissionShare: number;
  listingPrecompte: boolean | null;
  lowValue: number;
  midValue: number;
  highValue: number;
  lowMultiple: number;
  highMultiple: number;
  keyPoints: string[];
  sourceNote: string;
};

export type StudyInputLine = AnalyticsLine & { commissionType?: CommissionType | string };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isAdvanced(line: StudyInputLine): boolean {
  return line.commissionType === CommissionType.ADVANCED || line.commissionType === "ADVANCED";
}

function pctLabel(share: number): string {
  const p = share * 100;
  const digits = p >= 10 ? 0 : 1;
  return `${p.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`;
}

function joinFr(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} et ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

export function studyHeadline(byBranch: Share[]): string {
  if (byBranch.length === 0) return "Portefeuille de courtage";
  const top = byBranch.slice(0, 2).map((s) => s.label.toLowerCase());
  return `Portefeuille ${joinFr(top)}`;
}

export function studyZone(input: {
  isNationwide?: boolean;
  displayedZone?: string | null;
  departments: string[];
}): string {
  if (input.isNationwide) return "France (toutes régions)";
  if (input.displayedZone?.trim()) return input.displayedZone.trim();
  const unique = [...new Set(input.departments.filter(Boolean))];
  if (unique.length === 0) return "France";
  if (unique.length === 1) return `Département ${unique[0]}`;
  if (unique.length <= 4) return `Départements ${unique.join(", ")}`;
  return "France (plusieurs départements)";
}

export function studyKeyPoints(input: {
  byBranch: Share[];
  topCarrier: { name: string; share: number } | null;
  contractCount: number;
  carrierCount: number;
  advancedCommissionShare: number;
  listingPrecompte: boolean | null;
}): string[] {
  const points: string[] = [];
  const dominant = input.byBranch[0];
  const rest = input.byBranch.slice(1).filter((s) => s.share >= 0.005);
  if (dominant) {
    if (rest.length === 0) {
      points.push(
        `Portefeuille de ${dominant.label.toLowerCase()}, qui porte ${pctLabel(dominant.share)} des commissions.`,
      );
    } else {
      const autres = rest
        .slice(0, 3)
        .map((s) => `${s.label.toLowerCase()} (${pctLabel(s.share)})`)
        .join(", ");
      points.push(
        `Portefeuille dominé par ${dominant.label.toLowerCase()} (${pctLabel(dominant.share)} des commissions), complété par ${autres}.`,
      );
    }
  }
  if (input.topCarrier && input.carrierCount === 1) {
    points.push(
      `Concentration : ${input.contractCount} contrat${input.contractCount > 1 ? "s" : ""} placé${input.contractCount > 1 ? "s" : ""} auprès d’un seul assureur partenaire, ${input.topCarrier.name} (${pctLabel(input.topCarrier.share)} des commissions), point d’attention pour le risque fournisseur.`,
    );
  } else if (input.topCarrier) {
    points.push(
      `Concentration : ${input.carrierCount} compagnies, dont ${input.topCarrier.name} porte ${pctLabel(input.topCarrier.share)} des commissions.`,
    );
  }
  if (input.listingPrecompte === false || (input.listingPrecompte == null && input.advancedCommissionShare <= 0)) {
    points.push(
      "Ensemble des contrats hors période de reprise de précompte : aucun risque de reprise de commissions par l’assureur en cas de résiliation.",
    );
  } else if (input.advancedCommissionShare > 0) {
    points.push(
      `Part des commissions précomptées : ${pctLabel(input.advancedCommissionShare)}. À vérifier à l’audit (risque de reprise).`,
    );
  }
  points.push(
    `Analyse fondée sur l’export consolidé des contrats transmis par le cédant (${input.contractCount} contrat${input.contractCount > 1 ? "s" : ""} actif${input.contractCount > 1 ? "s" : ""}).`,
  );
  return points;
}

export function studyFromLines(input: {
  lines: StudyInputLine[];
  publicNumber: number | null;
  issuedAt: Date;
  dataCutoff: Date;
  zone: string;
  listingPrecompte: boolean | null;
  lowValue: number;
  midValue: number;
  highValue: number;
}): ValuationStudy {
  const byBranch = breakdownBy(
    input.lines,
    (l) => RISK_TYPE_LABELS[l.riskType as keyof typeof RISK_TYPE_LABELS] ?? l.riskType,
    8,
  );
  const byCarrier = breakdownBy(input.lines, (l) => l.carrier, 8);
  const annualCommissions = round2(input.lines.reduce((s, l) => s + l.annualCommission, 0));
  const contractCount = input.lines.length;
  const topCarrier = byCarrier[0] ? { name: byCarrier[0].label, share: byCarrier[0].share } : null;
  const carrierCount = new Set(input.lines.map((l) => l.carrier).filter(Boolean)).size;
  const advancedCommissionShare =
    annualCommissions > 0
      ? round2(input.lines.filter(isAdvanced).reduce((s, l) => s + l.annualCommission, 0) / annualCommissions)
      : 0;
  const lowMultiple = annualCommissions > 0 ? round2(input.lowValue / annualCommissions) : 0;
  const highMultiple = annualCommissions > 0 ? round2(input.highValue / annualCommissions) : 0;
  return {
    publicNumber: input.publicNumber,
    issuedAt: input.issuedAt,
    dataCutoff: input.dataCutoff,
    zone: input.zone,
    headline: studyHeadline(byBranch),
    contractCount,
    annualCommissions,
    monthlyCommissions: round2(annualCommissions / 12),
    carrierCount,
    topCarrier,
    byBranch,
    byCarrier,
    averageCommissionPerContract: contractCount > 0 ? round2(annualCommissions / contractCount) : 0,
    advancedCommissionShare,
    listingPrecompte: input.listingPrecompte,
    lowValue: input.lowValue,
    midValue: input.midValue,
    highValue: input.highValue,
    lowMultiple,
    highMultiple,
    keyPoints: studyKeyPoints({
      byBranch,
      topCarrier,
      contractCount,
      carrierCount,
      advancedCommissionShare,
      listingPrecompte: input.listingPrecompte,
    }),
    sourceNote: `Export consolidé des contrats transmis par le cédant, retenu comme source de référence (${contractCount} contrat${contractCount > 1 ? "s" : ""} actif${contractCount > 1 ? "s" : ""}). Données arrêtées au ${input.dataCutoff.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" })}.`,
  };
}

/** Fourchette affichée, arrondie à la centaine comme un dossier de place. */
export function roundedRange(low: number, high: number): { low: number; high: number } {
  const round = (n: number) => Math.max(0, Math.round(n / 100) * 100);
  const a = round(low);
  let b = round(high);
  if (b < a) b = a;
  return { low: a, high: b };
}
