/**
 * Tarifs du parcours de gré à gré.
 *
 * Deux cessions sur trois se nouent hors plateforme : les parties se
 * connaissent déjà, se sont accordées sur un prix, et n'ont besoin que de
 * formaliser. Leur vendre l'intermédiation entière n'aurait aucun sens — elles
 * ont fait le travail. Ce qui leur manque, c'est l'acte, les attestations, la
 * vérification des parties et un compte séquestre.
 *
 * D'où trois services indépendants, que l'on prend séparément ou ensemble.
 *
 * Les montants sont regroupés ici, et nulle part ailleurs : ce sont des
 * décisions commerciales, elles doivent pouvoir changer d'une ligne sans que
 * personne n'aille les chercher dans une page.
 *
 * Fonctions pures, testables sans base.
 */

/** Acte de cession, attestations de transfert, vérification des parties. */
export const KIT_RATE = 0.06;
export const KIT_CAP_EUR = 3_990;

/** Séquestre : part des fonds bloqués, libérés en deux temps. */
export const ESCROW_RATE = 0.02;

/** Attestations de transfert seules, forfait par dossier. */
export const ATTESTATIONS_FLAT_EUR = 89;

export const KIT_LABEL = "6 % HT, plafonnés à 3 990 € HT";
export const ESCROW_LABEL = "2 % des fonds séquestrés";
export const ATTESTATIONS_LABEL = "89 € HT par dossier";

export type DirectServices = {
  kit: boolean;
  escrow: boolean;
  attestations: boolean;
};

export type FeeLine = {
  key: keyof DirectServices;
  label: string;
  detail: string;
  amount: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sane(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Honoraires du kit contractuel.
 *
 * Le plafond est l'essentiel : au-delà d'environ 66 500 €, le prix de la
 * cession ne change plus rien au coût de sa formalisation. Rédiger un acte ne
 * coûte pas dix fois plus cher parce que le portefeuille vaut dix fois plus.
 */
export function kitFee(salePrice: number): number {
  return round2(Math.min(sane(salePrice) * KIT_RATE, KIT_CAP_EUR));
}

/** Prix à partir duquel le plafond du kit s'applique. */
export function kitCapReachedAt(): number {
  return round2(KIT_CAP_EUR / KIT_RATE);
}

/** Frais de séquestre, sur les fonds réellement bloqués. */
export function escrowFee(escrowedAmount: number): number {
  return round2(sane(escrowedAmount) * ESCROW_RATE);
}

/**
 * Détail des honoraires, service par service.
 *
 * Rendu sous forme de lignes plutôt que d'un total : celui qui paie doit
 * pouvoir retirer un service et voir ce qu'il économise.
 */
export function feeLines(input: {
  services: DirectServices;
  salePrice: number;
  escrowedAmount: number;
}): FeeLine[] {
  const lignes: FeeLine[] = [];

  if (input.services.kit) {
    lignes.push({
      key: "kit",
      label: "Kit contractuel",
      detail: KIT_LABEL,
      amount: kitFee(input.salePrice),
    });
  }
  if (input.services.escrow) {
    lignes.push({
      key: "escrow",
      label: "Transaction sécurisée",
      detail: ESCROW_LABEL,
      amount: escrowFee(input.escrowedAmount),
    });
  }
  /*
   * Les attestations sont comprises dans le kit : les facturer en plus
   * reviendrait à faire payer deux fois la même prestation.
   */
  if (input.services.attestations && !input.services.kit) {
    lignes.push({
      key: "attestations",
      label: "Attestations de transfert",
      detail: ATTESTATIONS_LABEL,
      amount: ATTESTATIONS_FLAT_EUR,
    });
  }

  return lignes;
}

export function feesTotal(lines: FeeLine[]): number {
  return round2(lines.reduce((somme, ligne) => somme + ligne.amount, 0));
}

/** Un dossier sans aucun service n'a pas lieu d'être ouvert. */
export function hasAnyService(services: DirectServices): boolean {
  return services.kit || services.escrow || services.attestations;
}
