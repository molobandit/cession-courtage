"use server";

import { AuthError } from "next-auth";
import { DistributionMode, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { enregistrerEchec, verrouActif } from "@/lib/auth/throttle";
import { prisma } from "@/lib/prisma";
import { allocatePublicAlias } from "@/lib/auth/alias";
import { investorOriasPlaceholder } from "@/lib/auth/investor-orias";
import { issueMagicLink } from "@/lib/auth/magic-link";
import { persistOriasLookup } from "@/lib/orias/persist";
import { notifySignupReceived } from "@/lib/notify/transactional";
import { hashPassword } from "@/lib/auth/password";
import { FREE_PLAN_DEAL_QUOTA, SUCCESS_FEE_RATE } from "@/lib/billing/rates";
import { departmentFromPostalCode, geoForDepartment } from "@/lib/geo";
import {
  emailCodeSchema,
  loginSchema,
  magicLinkRequestSchema,
  registerInvestorSchema,
  registerSchema,
} from "@/lib/validations/auth";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  ok?: boolean;
  /** Le mot de passe est bon, il manque le code du second facteur. */
  besoinDeCode?: boolean;
};

function firstIssue(errors: Record<string, string[] | undefined> | undefined): string | undefined {
  if (!errors) return undefined;
  for (const value of Object.values(errors)) {
    if (value?.[0]) return value[0];
  }
  return undefined;
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    jobTitle: formData.get("jobTitle") || undefined,
    email: formData.get("email"),
    phone: formData.get("phone"),
    legalName: formData.get("legalName"),
    legalForm: formData.get("legalForm"),
    address: formData.get("address"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    siren: formData.get("siren"),
    oriasNumber: formData.get("oriasNumber"),
    activityType: formData.get("activityType"),
    foundedYear: formData.get("foundedYear") || undefined,
    website: formData.get("website") || undefined,
    role: formData.get("role"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return { fieldErrors, error: firstIssue(fieldErrors) };
  }

  const data = parsed.data;
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const publicAlias = await allocatePublicAlias(data.role);
  const passwordHash = await hashPassword(data.password);
  const department = departmentFromPostalCode(data.postalCode);
  const geo = geoForDepartment(department);
  const foundedAt =
    data.foundedYear != null ? new Date(Date.UTC(data.foundedYear, 0, 1)) : undefined;

  try {
    const firm = await prisma.firm.create({
      data: {
        legalName: data.legalName,
        siren: data.siren,
        legalForm: data.legalForm,
        address: data.address,
        postalCode: data.postalCode,
        city: data.city,
        department,
        region: geo?.region ?? "France",
        foundedAt,
        distributionMode: DistributionMode.MIXED,
        complianceScore: 50,
        website: data.website ?? null,
        activityType: data.activityType,
      },
    });

    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: data.email,
          phone: data.phone,
          passwordHash,
          role: data.role,
          oriasNumber: data.oriasNumber,
          fullName,
          publicAlias,
          kycStatus: "NONE",
          firmId: firm.id,
          jobTitle: data.jobTitle ?? null,
        },
      });
    } catch (userError) {
      await prisma.firm.delete({ where: { id: firm.id } }).catch(() => undefined);
      throw userError;
    }

    try {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: "FREE",
          feeRate: SUCCESS_FEE_RATE.toFixed(4),
          dealQuota: FREE_PLAN_DEAL_QUOTA,
          dealsUsed: 0,
          status: "ACTIVE",
          renewsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (subscriptionError) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      await prisma.firm.delete({ where: { id: firm.id } }).catch(() => undefined);
      throw subscriptionError;
    }

    await persistOriasLookup(user.id).catch(() => null);
    await notifySignupReceived({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    }).catch(() => null);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      if (target.includes("email")) {
        return { error: "Un compte existe déjà avec cet e-mail." };
      }
      if (target.includes("oriasNumber")) {
        return { error: "Ce numéro ORIAS est déjà associé à un compte." };
      }
      if (target.includes("siren")) {
        return { error: "Ce SIREN est déjà associé à un cabinet." };
      }
      return { error: "Ces identifiants sont déjà utilisés." };
    }
    throw error;
  }

  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: "/en-attente-orias",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Compte créé, mais la connexion automatique a échoué. Connectez-vous." };
    }
    throw error;
  }
  return { ok: true };
}

export async function registerInvestorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerInvestorSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return { fieldErrors, error: firstIssue(fieldErrors) };
  }

  const data = parsed.data;
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const publicAlias = await allocatePublicAlias("INVESTOR");
  const passwordHash = await hashPassword(data.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "INVESTOR",
        oriasNumber: investorOriasPlaceholder(publicAlias),
        fullName,
        publicAlias,
        kycStatus: "NONE",
      },
    });
    try {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: "FREE",
          feeRate: SUCCESS_FEE_RATE.toFixed(4),
          dealQuota: FREE_PLAN_DEAL_QUOTA,
          dealsUsed: 0,
          status: "ACTIVE",
          renewsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (subscriptionError) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw subscriptionError;
    }

    await notifySignupReceived({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    }).catch(() => null);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Un compte existe déjà avec cet e-mail." };
    }
    throw error;
  }

  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: "/app/mes-dossiers",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Compte créé, mais la connexion automatique a échoué. Connectez-vous." };
    }
    throw error;
  }
  return { ok: true };
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return { fieldErrors, error: firstIssue(fieldErrors) };
  }
  const next = String(formData.get("next") || "/app");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  // Verrou progressif : sans lui, rien n'empeche d'essayer des mots de passe en
  // boucle sur un compte connu.
  const verrou = await verrouActif(parsed.data.email);
  if (verrou) return { error: verrou };

  /*
   * Aucune verification de mot de passe ici : elle a lieu une seule fois, dans
   * `authorize`. Verifier avant pour savoir s'il faut reclamer un code coutait
   * un second PBKDF2 a chaque connexion, soit 1,2 million d'iterations pour un
   * seul essai. C'est `authorize` qui signale le besoin de code, par une erreur
   * typee, une fois le mot de passe reconnu.
   */
  const code = String(formData.get("totp") ?? "").trim();

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      totp: code,
      redirectTo: safeNext,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Mot de passe reconnu, il ne manque que le second facteur : on le
      // reclame sans compter d'echec, l'utilisateur n'a rien rate.
      if ((error as { code?: string }).code === "totp_required") {
        return { besoinDeCode: true };
      }
      await enregistrerEchec(parsed.data.email);
      return code
        ? { besoinDeCode: true, error: "Code de vérification refusé." }
        : { error: "E-mail ou mot de passe incorrect." };
    }
    throw error;
  }
  return { ok: true };
}

export async function requestMagicLinkAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = magicLinkRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return { fieldErrors, error: firstIssue(fieldErrors) };
  }
  await issueMagicLink(parsed.data.email);
  redirect(`/lien-envoye?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function consumeEmailCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailCodeSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return { fieldErrors, error: firstIssue(fieldErrors) };
  }

  try {
    await signIn("magic-link", {
      email: parsed.data.email,
      token: parsed.data.code,
      redirectTo: "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Code invalide ou expiré. Demandez-en un nouveau." };
    }
    throw error;
  }
  return { ok: true };
}
