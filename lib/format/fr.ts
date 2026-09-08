import { Prisma } from "@prisma/client";

/**
 * Les montants s'affichent a l'euro entier dans toute l'interface : les tableaux
 * de l'espace membre sont denses et les centimes n'y apportent rien. Utiliser
 * formatEuroPrecise quand le centime a une valeur juridique (acte, sequestre).
 */
const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const euroPrecise = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const dateFr = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatEuro(value: Prisma.Decimal | number | string): string {
  return euro.format(Number(value));
}

/** Montant au centime, pour les documents contractuels. */
export function formatEuroPrecise(value: Prisma.Decimal | number | string): string {
  return euroPrecise.format(Number(value));
}

/** Valeur absente dans un tableau. Jamais un tiret cadratin. */
export const EMPTY_CELL = "Non renseigné";

export function formatDate(value: Date | string): string {
  return dateFr.format(typeof value === "string" ? new Date(value) : value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
}
