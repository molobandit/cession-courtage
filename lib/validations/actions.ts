import { z } from "zod";
import { ASKING_MAX, ASKING_MIN } from "@/lib/listing/constants";
import { parseFrenchNumber } from "@/lib/import/values";

/**
 * Schemas des entrees d'actions serveur. Toute donnee venant d'un formulaire
 * passe par ici : les gardes d'acces verifient qui agit, ces schemas verifient
 * ce qui est envoye.
 */

/** Identifiant technique (cuid). Non vide, longueur bornee, jeu de caracteres restreint. */
export const idSchema = z
  .string()
  .trim()
  .min(1, "Identifiant manquant.")
  .max(64, "Identifiant invalide.")
  .regex(/^[A-Za-z0-9_-]+$/, "Identifiant invalide.");

/** Montant saisi au format francais : « 45 000 », « 1 234,50 ». */
const frenchAmount = z.preprocess((value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  return parseFrenchNumber(value) ?? undefined;
}, z.number({ message: "Montant invalide." }).finite("Montant invalide."));

export const offerSchema = z.object({
  listingId: idSchema,
  amount: frenchAmount
    .refine((v) => v >= ASKING_MIN && v <= ASKING_MAX, {
      message: `Montant d’offre hors fourchette (${ASKING_MIN} à ${ASKING_MAX} €).`,
    }),
  upfrontPercent: frenchAmount.refine((v) => v >= 0 && v <= 100, {
    message: "Le comptant doit être compris entre 0 et 100 %.",
  }),
  message: z
    .string()
    .trim()
    .min(10, "Précisez un message d’au moins 10 caractères.")
    .max(2000, "Message trop long (2 000 caractères au maximum)."),
});

export const offerIdSchema = z.object({ offerId: idSchema });

export const listingCreateSchema = z.object({
  portfolioId: idSchema,
  // Le prix demandé s'exprime en euros entiers.
  askingPrice: frenchAmount
    .transform((v) => Math.round(v))
    .refine((v) => v >= ASKING_MIN && v <= ASKING_MAX, {
      message: `Le prix demandé doit être compris entre ${ASKING_MIN.toLocaleString("fr-FR")} et ${ASKING_MAX.toLocaleString("fr-FR")} €.`,
    }),
  sellerSupportMonths: z.coerce
    .number()
    .int("Durée d’accompagnement invalide.")
    .min(0)
    .max(24, "L’accompagnement ne peut pas dépasser 24 mois."),
});

export const retentionReportSchema = z
  .object({
    dealId: idSchema,
    monthIndex: z.coerce
      .number()
      .int()
      .refine((v) => v === 3 || v === 6 || v === 12, {
        message: "Le relevé porte sur le troisième, sixième ou douzième mois.",
      }),
    contractsRetained: z.coerce.number().int().min(0, "Nombre de contrats invalide."),
    contractsTransferred: z.coerce.number().int().min(1, "Nombre de contrats invalide."),
    actualCommissions: frenchAmount.refine((v) => v >= 0, {
      message: "Commissions constatées invalides.",
    }),
  })
  .refine((data) => data.contractsRetained <= data.contractsTransferred, {
    message: "Les contrats conservés ne peuvent pas dépasser les contrats transférés.",
    path: ["contractsRetained"],
  });

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(2, "Le message ne peut pas être vide.")
    .max(4000, "Message trop long (4 000 caractères au maximum)."),
});

export const mandateSchema = z
  .object({
    maxBudget: frenchAmount.refine((v) => v > 0, { message: "Budget invalide." }),
    minCommissions: frenchAmount.refine((v) => v >= 0, {
      message: "Commissions minimales invalides.",
    }),
    maxCommissions: frenchAmount.refine((v) => v > 0, {
      message: "Commissions maximales invalides.",
    }),
  })
  .refine((data) => data.minCommissions <= data.maxCommissions, {
    message: "La borne basse des commissions dépasse la borne haute.",
    path: ["minCommissions"],
  });

/** Premier message d'erreur, pour affichage dans un formulaire. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Saisie invalide.";
}
