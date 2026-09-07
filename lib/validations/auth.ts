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

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Indiquez votre nom professionnel.")
    .max(120),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  oriasNumber,
  role: z.enum(["SELLER", "BUYER", "BOTH"], {
    message: "Choisissez un rôle.",
  }),
  password,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
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
