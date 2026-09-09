/**
 * Formatage francais pur, sans dependance Prisma : utilisable dans un composant client.
 * Espace insecable pour les milliers, virgule decimale.
 */

const euroWhole = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Montant arrondi a l'euro, ex. « 85 500 € ». */
export function formatEuroWhole(value: number): string {
  if (!Number.isFinite(value)) return "0 €";
  return euroWhole.format(value);
}

/** Nombre entier, ex. « 7 663 ». */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return decimal.format(value);
}

/** Convertit une saisie francaise (« 45 000 », « 1 234,50 ») en nombre. */
export function parseFrenchInput(raw: string): number | null {
  const cleaned = raw
    .replace(/[\s  ]/g, "")
    .replace(/€/g, "")
    .replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
