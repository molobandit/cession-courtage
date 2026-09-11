import { formatEuroWhole } from "@/lib/format/number";

export const INVESTOR_TYPE_LABELS: Record<string, string> = {
  FUND: "Société d’investissement / fonds",
  GROWING_BROKER: "Professionnel du secteur",
  HOLDING: "Holding",
  FAMILY_OFFICE: "Family office",
  PRIVATE: "Investisseur privé / particulier",
  ENTREPRENEUR: "Entrepreneur",
  OTHER: "Autre",
};

export const INVESTOR_INTERVENTION_LABELS: Record<string, string> = {
  FINANCING: "Financement",
  EQUITY: "Prise de participation",
  DEBT: "Dette",
  CO_INVEST: "Co-investissement",
  ACQUISITION: "Acquisition",
  PARTNERSHIP: "Partenariat",
  BOTH: "Acquisition et partenariat",
  OTHER: "Autre",
};

export function investorTypeLabel(value: string): string {
  return INVESTOR_TYPE_LABELS[value] ?? value;
}

export function investorInterventionLabel(value: string): string {
  return INVESTOR_INTERVENTION_LABELS[value] ?? value;
}

export function formatInvestorTicket(minEur: number | null, maxEur: number | null): string {
  if (minEur == null && maxEur == null) return "Non renseigné";
  if (minEur != null && maxEur != null) {
    return `${formatEuroWhole(minEur)} – ${formatEuroWhole(maxEur)}`;
  }
  if (minEur != null) return `à partir de ${formatEuroWhole(minEur)}`;
  return `jusqu’à ${formatEuroWhole(maxEur!)}`;
}
