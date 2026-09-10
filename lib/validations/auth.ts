import { z } from "zod";

const oriasNumber = z
  .string()
  .trim()
  .regex(/^\d{8}$/, "Le numéro ORIAS doit contenir exactement 8 chiffres.");

const password = z
  .string()
  .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
  .regex(/[A-Za-z]/, "Le mot de passe doit contenir une lettre.")
  .regex(/\d/, "Le mot de passe doit contenir un chiffre.");

const sirenOrSiret = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, ""))
  .refine((v) => /^\d{9}$/.test(v) || /^\d{14}$/.test(v), {
    message: "Indiquez un SIREN (9 chiffres) ou un SIRET (14 chiffres).",
  })
  .transform((v) => v.slice(0, 9));

export const LEGAL_FORMS = ["SAS", "SASU", "SARL", "EURL", "SA", "SNC", "Autre"] as const;

export const ACTIVITY_TYPES = [
  "Courtage IARD",
  "Courtage vie et prévoyance",
  "Courtage mixte",
  "Courtage spécialisé",
  "MGA",
  "Autre",
] as const;

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "Indiquez le prénom du dirigeant.").max(80),
    lastName: z.string().trim().min(1, "Indiquez le nom du dirigeant.").max(80),
    jobTitle: z
      .string()
      .trim()
      .max(80)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
    phone: z
      .string()
      .trim()
      .min(8, "Indiquez un téléphone professionnel.")
      .max(30),
    legalName: z.string().trim().min(2, "Indiquez le nom de la société.").max(160),
    legalForm: z.enum(LEGAL_FORMS, { message: "Choisissez une forme juridique." }),
    address: z.string().trim().min(5, "Indiquez l’adresse du siège.").max(200),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{5}$/, "Le code postal doit contenir 5 chiffres."),
    city: z.string().trim().min(2, "Indiquez la ville.").max(80),
    siren: sirenOrSiret,
    oriasNumber,
    activityType: z.enum(ACTIVITY_TYPES, { message: "Indiquez le type d’activité." }),
    foundedYear: z.preprocess((value) => {
      if (value == null || value === "") return undefined;
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }, z.number().int().min(1900).max(new Date().getFullYear()).optional()),
    website: z
      .string()
      .trim()
      .max(200)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    role: z.enum(["SELLER", "BUYER", "BOTH"], {
      message: "Choisissez un rôle.",
    }),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Saisissez votre mot de passe."),
});

export const magicLinkRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

export const magicLinkConsumeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().min(16),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
