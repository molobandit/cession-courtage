import { Prisma } from "@prisma/client";

const euro = new Intl.NumberFormat("fr-FR", {
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

export function formatDate(value: Date | string): string {
  return dateFr.format(typeof value === "string" ? new Date(value) : value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
}
