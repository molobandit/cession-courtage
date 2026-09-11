import type { RegulatoryBrief } from "@/lib/listing/brief-fields";

const TRANSFER: Record<string, string> = {
  parts: "Cession de parts sociales",
  fonds: "Cession de fonds / portefeuille",
  mixte: "Mixte (parts et fonds)",
};

const DISTRIBUTION: Record<string, string> = {
  agence: "Agence / bureau",
  distance: "Vente à distance",
  mixte: "Mixte",
};

const DEMA: Record<string, string> = {
  aucun: "Aucun démarchage",
  conforme: "Activité conforme Bloctel",
  a_regulariser: "À régulariser",
};

const MOTIVE: Record<string, string> = {
  retraite: "Départ à la retraite",
  recentrage: "Recentrage d’activité",
  cession_partielle: "Cession partielle",
  transmission: "Transmission",
  autre: "Autre",
};

const DDA: Record<string, string> = {
  a_jour: "Formations DDA à jour",
  en_cours: "Plan de rattrapage en cours",
  a_regulariser: "À régulariser",
};

const AML: Record<string, string> = {
  formalise: "Dispositif LCB-FT formalisé",
  en_cours: "Mise à jour en cours",
  a_regulariser: "À formaliser",
};

const DEPENDENCY: Record<string, string> = {
  faible: "Faible (équipe autonome)",
  moyenne: "Moyenne",
  forte: "Forte (activité portée par le cédant)",
};

function mapped(table: Record<string, string>, value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  return table[raw] ?? raw;
}

export function cessionMotiveLabel(value: string | null | undefined): string | null {
  return mapped(MOTIVE, value);
}

export function regulatoryFacts(reg: RegulatoryBrief): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string | null }> = [
    { label: "Objet de la cession", value: mapped(TRANSFER, reg.transferVehicle) },
    { label: "Catégories ORIAS", value: reg.oriasCategories },
    { label: "Distribution", value: mapped(DISTRIBUTION, reg.distribution) },
    { label: "Part vente à distance", value: reg.distanceShare },
    { label: "Démarchage", value: mapped(DEMA, reg.complianceDema) },
    { label: "RC professionnelle", value: reg.rcProInsurer },
    { label: "Effectif", value: reg.employeeCount },
    { label: "Apporteurs", value: reg.introducersCount },
    { label: "Logiciels métier", value: reg.softwareStack },
    { label: "Formation DDA", value: mapped(DDA, reg.ddaTraining) },
    { label: "LCB-FT", value: mapped(AML, reg.amlProcedure) },
    { label: "Dépendance au cédant", value: mapped(DEPENDENCY, reg.sellerDependency) },
    { label: "Locaux", value: reg.premisesStatus },
    { label: "Mandats exclusifs", value: reg.exclusiveMandates },
    { label: "Storno / clawback", value: reg.stornoShare },
    { label: "Engagements sociaux", value: reg.socialCommitments },
    { label: "Litiges", value: reg.pendingLitigation },
  ];
  return rows
    .filter((row): row is { label: string; value: string } => Boolean(row.value?.trim()))
    .map((row) => ({ label: row.label, value: row.value.trim() }));
}
