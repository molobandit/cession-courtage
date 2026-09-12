/**
 * Découpage d'un portefeuille en lots par fournisseur.
 *
 * Un portefeuille de courtage ne se vend pas toujours d'un bloc. L'acquéreur
 * qui a déjà un code chez un assureur veut souvent le livre d'un autre, et le
 * cédant préfère souvent céder par morceaux plutôt que d'attendre le repreneur
 * unique qui prendra tout.
 *
 * Le fournisseur est la maille naturelle du découpage, et pas un choix
 * d'affichage : c'est lui qui détient le code de courtage, signe l'attestation
 * de transfert et verse la commission. Découper par branche ou par département
 * donnerait des lots qu'aucune compagnie ne saurait transférer.
 *
 * Fonctions pures, sans base ni réseau. Les montants sont en euros, arrondis au
 * centime au moment où ils deviennent un prix.
 */

export type ContractLineLike = {
  carrier: string;
  annualCommission: number;
};

export type CarrierLot = {
  carrier: string;
  /** Commissions annuelles portées par ce fournisseur. */
  annualCommission: number;
  contractCount: number;
  /** Part du portefeuille, de 0 à 1, mesurée en commissions. */
  share: number;
};

export type LotSelection = {
  carriers: string[];
  annualCommission: number;
  contractCount: number;
  share: number;
  /** Vrai si la sélection couvre tout le portefeuille. */
  full: boolean;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Regroupe les lignes par fournisseur, du plus gros lot au plus petit.
 *
 * L'ordre compte : le premier écran de l'acquéreur doit montrer d'abord ce qui
 * pèse. À commissions égales, l'ordre alphabétique rend l'affichage stable
 * d'un chargement à l'autre.
 */
export function buildCarrierLots(lines: ContractLineLike[]): CarrierLot[] {
  const parFournisseur = new Map<string, { commission: number; contrats: number }>();
  for (const line of lines) {
    const cle = line.carrier.trim();
    if (!cle) continue;
    const agrege = parFournisseur.get(cle) ?? { commission: 0, contrats: 0 };
    agrege.commission += line.annualCommission;
    agrege.contrats += 1;
    parFournisseur.set(cle, agrege);
  }

  const total = [...parFournisseur.values()].reduce((somme, l) => somme + l.commission, 0);

  return [...parFournisseur.entries()]
    .map(([carrier, l]) => ({
      carrier,
      annualCommission: round2(l.commission),
      contractCount: l.contrats,
      share: total > 0 ? l.commission / total : 0,
    }))
    .sort((a, b) => b.annualCommission - a.annualCommission || a.carrier.localeCompare(b.carrier));
}

/** Commissions annuelles de tout le portefeuille. */
export function lotsTotalCommission(lots: CarrierLot[]): number {
  return round2(lots.reduce((somme, lot) => somme + lot.annualCommission, 0));
}

/**
 * Ce que représente une sélection de fournisseurs.
 *
 * Les fournisseurs inconnus sont ignorés plutôt que refusés : une sélection
 * venue d'un formulaire ne doit pas pouvoir gonfler une part.
 */
export function summarizeSelection(lots: CarrierLot[], carriers: string[]): LotSelection {
  const demandes = new Set(carriers.map((c) => c.trim()).filter(Boolean));
  const retenus = lots.filter((lot) => demandes.has(lot.carrier));
  const total = lotsTotalCommission(lots);
  const commission = round2(retenus.reduce((somme, lot) => somme + lot.annualCommission, 0));

  return {
    carriers: retenus.map((lot) => lot.carrier),
    annualCommission: commission,
    contractCount: retenus.reduce((somme, lot) => somme + lot.contractCount, 0),
    share: total > 0 ? commission / total : 0,
    full: retenus.length > 0 && retenus.length === lots.length,
  };
}

/**
 * Prix indicatif d'un lot, au prorata des commissions.
 *
 * Indicatif, et rien de plus : un lot partiel ne vaut pas mécaniquement sa part
 * du tout. Un livre concentré sur un seul assureur se reprend plus facilement,
 * un reliquat éparpillé beaucoup moins. Le chiffre sert de point de départ à
 * l'offre, que l'acquéreur reste libre de fixer.
 */
export function proRataPrice(askingPrice: number, share: number): number {
  if (!Number.isFinite(askingPrice) || askingPrice <= 0) return 0;
  const part = Math.min(Math.max(share, 0), 1);
  return round2(askingPrice * part);
}

/**
 * Deux lots se chevauchent-ils ?
 *
 * C'est la question qui autorise, ou non, deux cessions simultanées sur une
 * même annonce. Un fournisseur ne peut être cédé qu'une fois.
 */
export function lotsOverlap(a: string[], b: string[]): boolean {
  const premiers = new Set(a.map((c) => c.trim()).filter(Boolean));
  return b.some((carrier) => premiers.has(carrier.trim()));
}

/** Fournisseurs encore disponibles, une fois retirés ceux déjà engagés. */
export function availableCarriers(lots: CarrierLot[], taken: string[][]): string[] {
  const engages = new Set(taken.flat().map((c) => c.trim()).filter(Boolean));
  return lots.filter((lot) => !engages.has(lot.carrier)).map((lot) => lot.carrier);
}

/**
 * L'annonce est-elle entièrement engagée ?
 *
 * Tant qu'il reste un fournisseur libre, l'annonce doit rester ouverte aux
 * offres : c'est tout l'intérêt de la vente par lots.
 */
export function fullyCommitted(lots: CarrierLot[], taken: string[][]): boolean {
  return lots.length > 0 && availableCarriers(lots, taken).length === 0;
}

/** Libellé court d'une sélection, pour les listes et les courriels. */
export function selectionLabel(selection: LotSelection, lots: CarrierLot[]): string {
  if (selection.carriers.length === 0) return "Aucun fournisseur retenu";
  if (selection.full) return "Portefeuille entier";
  const part = Math.round(selection.share * 100);
  const sur = `${selection.carriers.length} fournisseur${selection.carriers.length > 1 ? "s" : ""} sur ${lots.length}`;
  return `Lot partiel · ${sur} · ${part} % des commissions`;
}
