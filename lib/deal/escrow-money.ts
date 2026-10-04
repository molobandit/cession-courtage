import type { DealStage } from "@prisma/client";

/**
 * Où est l'argent d'un dossier, à chaque étape.
 *
 * Les dossiers de référence décrivent un seul chemin. Le montant de l'annonce
 * part sur un compte sécurisé tenu par le trust, le dépôt de positionnement
 * déjà versé s'impute dessus. Le trust libère les fonds au cédant après
 * contrôle et accord des compagnies, en gardant le séquestre de conservation :
 * 20 % du montant, qui reviennent à l'acquéreur, au prorata, uniquement si la
 * déperdition dépasse 10 %.
 *
 * L'écran affichait « Dans le trust : le montant entier » même sur une cession
 * close, où le trust ne garde plus que ce séquestre. Fonction pure, testée
 * étape par étape.
 */

/** Part du montant retenue par le trust après la clôture. */
export const RETENTION_SHARE = 0.2;

/** Seuil de déperdition au delà duquel le séquestre revient à l'acquéreur. */
export const RETENTION_TRIGGER = 0.1;

export const RETENTION_RULE =
  "Cette part revient à l’acquéreur, au prorata, uniquement si la déperdition dépasse 10 %.";

export type DealMoney = {
  /** Ce que le trust détient aujourd'hui. */
  inTrust: number;
  /** Ce qui est déjà parti au cédant. */
  paidToSeller: number;
  /** Le séquestre de conservation, une fois la cession close. */
  retention: number;
  /** Ce qui reste à verser sur le compte sécurisé. */
  toFund: number;
  /** Ce qu'on écrit sous le chiffre du trust. */
  trustLabel: string;
};

const arrondi = (n: number) => Math.round(n * 100) / 100;

export function dealMoney(input: {
  stage: DealStage;
  /** Montant de l'annonce, celui du dossier. */
  amount: number;
  /** Dépôt de positionnement déjà versé, imputé sur le montant. */
  deposit: number;
  /** NONE tant que rien n'est sur le compte sécurisé. */
  escrowStage?: string | null;
}): DealMoney {
  const montant = Number.isFinite(input.amount) && input.amount > 0 ? input.amount : 0;
  const depot = Number.isFinite(input.deposit) && input.deposit > 0 ? Math.min(input.deposit, montant) : 0;
  const retention = arrondi(montant * RETENTION_SHARE);
  const verse = (input.escrowStage ?? "NONE") !== "NONE";

  // Cession close : le trust ne garde plus que le séquestre de conservation.
  if (input.stage === "CLOSED" || input.stage === "RETENTION") {
    return {
      inTrust: retention,
      paidToSeller: arrondi(montant - retention),
      retention,
      toFund: 0,
      trustLabel: `Séquestre de conservation, ${Math.round(RETENTION_SHARE * 100)} % du montant`,
    };
  }

  // Fonds reçus par le trust, en attente de l'accord des compagnies.
  if (verse) {
    return {
      inTrust: arrondi(montant - depot),
      paidToSeller: 0,
      retention,
      toFund: 0,
      trustLabel: depot > 0 ? `Dépôt de positionnement de ${depot.toFixed(2)} déduit` : "Montant de l’annonce",
    };
  }

  // Avant le versement : seul le dépôt de positionnement est au trust.
  return {
    inTrust: depot,
    paidToSeller: 0,
    retention,
    toFund: arrondi(montant - depot),
    trustLabel: depot > 0 ? "Dépôt de positionnement" : "Rien n’est encore versé",
  };
}
