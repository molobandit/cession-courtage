/**
 * Arithmetique monetaire. Les montants sont manipules en euros mais toute somme
 * doit passer par ici : additionner des flottants sans arrondir produit des
 * ecarts de quelques centimes, qu'un acquereur releve pendant la verification
 * prealable.
 */

/** Arrondit au centime, comme le fait l'enregistrement en base. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Somme exacte d'une liste de montants deja arrondis au centime. */
export function sumMoney(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + toCents(amount), 0) / 100;
}
