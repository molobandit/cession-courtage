/**
 * Suivi du transfert des codes de courtage.
 *
 * Une cession de portefeuille ne transfere pas seulement des contrats : chaque
 * compagnie doit accepter de reattribuer le code de courtage a l'acquereur.
 * Sans cet accord, les commissions cessent apres la signature. C'est le premier
 * motif d'echec d'une cession en France, et il se traite avant le closing.
 *
 * Fonctions pures : la page leur passe les lignes de contrat et les etats connus.
 */

export type CarrierStatus = "PENDING" | "NOTIFIED" | "AGREED" | "REFUSED";

export const CARRIER_STATUS_LABELS: Record<CarrierStatus, string> = {
  PENDING: "À informer",
  NOTIFIED: "Informée",
  AGREED: "Accord obtenu",
  REFUSED: "Refus",
};

/** Ordre d'avancement. Sert a trier : ce qui reste a faire remonte en tete. */
const STATUS_RANK: Record<CarrierStatus, number> = {
  REFUSED: 0,
  PENDING: 1,
  NOTIFIED: 2,
  AGREED: 3,
};

export type CarrierLine = { carrier: string; annualCommission: number };

export type CarrierCodeRow = {
  carrier: string;
  status: CarrierStatus;
  /** Commissions annuelles portees par cette compagnie, en euros. */
  commissions: number;
  /** Part du portefeuille, entre 0 et 1. */
  share: number;
  contracts: number;
  note: string | null;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Croise les compagnies reellement presentes dans le portefeuille avec les
 * etats deja saisis. Une compagnie inconnue du suivi est « a informer » :
 * l'oubli est impossible, la liste se construit toujours depuis les contrats.
 */
export function buildCarrierCodes(
  lines: CarrierLine[],
  known: { carrier: string; status: CarrierStatus; note?: string | null }[],
): CarrierCodeRow[] {
  const totals = new Map<string, { commissions: number; contracts: number }>();
  let total = 0;

  for (const line of lines) {
    const carrier = line.carrier || "Non renseignée";
    const current = totals.get(carrier) ?? { commissions: 0, contracts: 0 };
    current.commissions += line.annualCommission;
    current.contracts += 1;
    totals.set(carrier, current);
    total += line.annualCommission;
  }

  const byCarrier = new Map(known.map((k) => [k.carrier, k]));

  return [...totals.entries()]
    .map(([carrier, v]) => {
      const entry = byCarrier.get(carrier);
      return {
        carrier,
        status: entry?.status ?? ("PENDING" as CarrierStatus),
        commissions: round2(v.commissions),
        share: total > 0 ? v.commissions / total : 0,
        contracts: v.contracts,
        note: entry?.note ?? null,
      };
    })
    .sort((a, b) => {
      const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (rank !== 0) return rank;
      return b.commissions - a.commissions;
    });
}

export type CarrierRisk = {
  total: number;
  agreed: number;
  refused: number;
  pending: number;
  /** Commissions couvertes par un accord, en euros. */
  securedCommissions: number;
  /** Commissions perdues sur refus, en euros. */
  lostCommissions: number;
  /** Commissions encore suspendues a une reponse, en euros. */
  atRiskCommissions: number;
  /** Part des commissions securisees, entre 0 et 1. */
  securedShare: number;
};

/** Ce que le suivi des codes met en jeu, en euros et non en nombre de compagnies. */
export function carrierRisk(rows: CarrierCodeRow[]): CarrierRisk {
  let secured = 0;
  let lost = 0;
  let atRisk = 0;
  let agreed = 0;
  let refused = 0;
  let pending = 0;

  for (const row of rows) {
    if (row.status === "AGREED") {
      secured += row.commissions;
      agreed += 1;
    } else if (row.status === "REFUSED") {
      lost += row.commissions;
      refused += 1;
    } else {
      atRisk += row.commissions;
      pending += 1;
    }
  }

  const total = secured + lost + atRisk;
  return {
    total: rows.length,
    agreed,
    refused,
    pending,
    securedCommissions: round2(secured),
    lostCommissions: round2(lost),
    atRiskCommissions: round2(atRisk),
    securedShare: total > 0 ? secured / total : 0,
  };
}
