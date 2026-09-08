"use server";

import { AuthError } from "next-auth";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { allocatePublicAlias } from "@/lib/auth/alias";
import { issueMagicLink } from "@/lib/auth/magic-link";
import { hashPassword } from "@/lib/auth/password";
import { FREE_PLAN_DEAL_QUOTA, SUCCESS_FEE_RATE } from "@/lib/billing/rates";
import { prisma } from "@/lib/prisma";
import {
  loginSchema,
  magicLinkRequestSchema,
  registerSchema,
} from "@/lib/validations/auth";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  ok?: boolean;
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
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    oriasNumber: formData.get("oriasNumber"),
    role: formData.get("role"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return { fieldErrors, error: firstIssue(fieldErrors) };
  }

  const data = parsed.data;
  const publicAlias = await allocatePublicAlias(data.role);
  const passwordHash = await hashPassword(data.password);
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          phone: data.phone,
          passwordHash,
          role: data.role,
          oriasNumber: data.oriasNumber,
          fullName: data.fullName,
          publicAlias,
          kycStatus: "NONE",
        },
      });
      await tx.subscription.create({
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
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      if (target.includes("email")) {
        return { error: "Un compte existe déjà avec cet e-mail." };
      }
      if (target.includes("oriasNumber")) {
        return { error: "Ce numéro ORIAS est déjà associé à un compte." };
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
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeNext,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou mot de passe incorrect." };
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

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
