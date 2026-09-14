import { formatEuroWhole } from "@/lib/format/number";

export type PerceptionMode = "LINEAR" | "PRECOMPTE" | "UNSTATED";

export function perceptionMode(precompte: boolean | null | undefined): PerceptionMode {
  if (precompte === true) return "PRECOMPTE";
  if (precompte === false) return "LINEAR";
  return "UNSTATED";
}

export function perceptionLabel(mode: PerceptionMode): string {
  if (mode === "PRECOMPTE") return "Précompte";
  if (mode === "LINEAR") return "Linéaire";
  return "Non précisé";
}

export function parsePrecompteAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function commissionPerceptionCopy(input: {
  annualCommissions: number;
  precompte: boolean | null | undefined;
  precompteAmount?: string | null;
}): { annualLine: string; modeLine: string; amountLine: string | null; mode: PerceptionMode } {
  const mode = perceptionMode(input.precompte);
  const amount = parsePrecompteAmount(input.precompteAmount ?? null);
  return {
    mode,
    annualLine: `Commissions annuelles : ${formatEuroWhole(input.annualCommissions)}`,
    modeLine: `Mode de perception : ${perceptionLabel(mode)}`,
    amountLine:
      mode === "PRECOMPTE" && amount != null
        ? `Montant précompté : ${formatEuroWhole(amount)} / an`
        : null,
  };
}

/**
 * Linéaire ou précompte, tel qu'on l'affiche sous les commissions.
 *
 * Ce que le cédant a déclaré fait foi. À défaut, le bordereau importé le dit :
 * chaque contrat porte son type de commission, et le portefeuille est dit
 * « précompte » quand la majorité de ses commissions l'est. Sans déclaration ni
 * contrat, rien n'est inventé.
 */
export function precompteFromContracts(
  declared: boolean | null | undefined,
  advancedCommissions: number,
  totalCommissions: number,
): boolean | null {
  if (declared === true || declared === false) return declared;
  if (!(totalCommissions > 0)) return null;
  return advancedCommissions / totalCommissions >= 0.5;
}
