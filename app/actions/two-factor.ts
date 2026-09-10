"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/authz/actor";
import { UnauthenticatedError } from "@/lib/authz/errors";
import { verifyPassword } from "@/lib/auth/password";
import {
  empreinteCodeDeSecours,
  genererCodesDeSecours,
  genererSecret,
  uriOtpauth,
  verifierCode,
} from "@/lib/auth/totp";
import { prisma } from "@/lib/prisma";
import { BRAND_NAME } from "@/lib/site";

export type DeuxFacteursState = {
  error?: string;
  secret?: string;
  uri?: string;
  codesDeSecours?: string[];
  active?: boolean;
};

/**
 * Prepare l'activation : produit un secret et l'URI a scanner.
 *
 * Le second facteur reste inactif jusqu'a ce qu'un premier code soit valide.
 * Activer sur la seule creation du secret fermerait le compte de quiconque
 * aurait mal recopie la cle.
 */
export async function preparerDeuxFacteursAction(): Promise<DeuxFacteursState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();

    const secret = genererSecret();
    await prisma.twoFactor.upsert({
      where: { userId: actor.id },
      update: { secret, confirmedAt: null },
      create: { userId: actor.id, secret },
    });

    return { secret, uri: uriOtpauth(secret, actor.email, BRAND_NAME) };
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    return { error: "Préparation impossible." };
  }
}

/** Valide le premier code, active le second facteur et remet les codes de secours. */
export async function activerDeuxFacteursAction(
  _prev: DeuxFacteursState,
  formData: FormData,
): Promise<DeuxFacteursState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();

    const ligne = await prisma.twoFactor.findUnique({
      where: { userId: actor.id },
      select: { secret: true },
    });
    if (!ligne) return { error: "Commencez par afficher la clé à enregistrer." };

    const saisie = String(formData.get("code") ?? "");
    if (!(await verifierCode(ligne.secret, saisie))) {
      return { error: "Code refusé. Vérifiez l’heure de votre téléphone et réessayez." };
    }

    // Les codes de secours sont haches comme des mots de passe : ils ne seront
    // plus jamais lisibles apres cet ecran, ni par nous ni par un intrus.
    const codes = genererCodesDeSecours();
    await prisma.recoveryCode.deleteMany({ where: { userId: actor.id } });
    for (const code of codes) {
      await prisma.recoveryCode.create({
        data: { userId: actor.id, codeHash: await empreinteCodeDeSecours(code) },
      });
    }

    await prisma.twoFactor.update({
      where: { userId: actor.id },
      data: { confirmedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "user.two_factor.enabled",
        entityType: "User",
        entityId: actor.id,
      },
    });

    revalidatePath("/app/profil");
    return { active: true, codesDeSecours: codes };
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    return { error: "Activation impossible." };
  }
}

/**
 * Desactive le second facteur, mot de passe a l'appui.
 *
 * Sans cette verification, une session laissee ouverte suffirait a retirer la
 * protection : le second facteur ne protegerait alors plus grand-chose.
 */
export async function desactiverDeuxFacteursAction(
  _prev: DeuxFacteursState,
  formData: FormData,
): Promise<DeuxFacteursState> {
  try {
    const actor = await getActor();
    if (!actor) throw new UnauthenticatedError();

    const compte = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { passwordHash: true },
    });
    const motDePasse = String(formData.get("password") ?? "");
    if (!compte?.passwordHash || !(await verifyPassword(motDePasse, compte.passwordHash))) {
      return { error: "Mot de passe incorrect." };
    }

    await prisma.twoFactor.deleteMany({ where: { userId: actor.id } });
    await prisma.recoveryCode.deleteMany({ where: { userId: actor.id } });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "user.two_factor.disabled",
        entityType: "User",
        entityId: actor.id,
      },
    });

    revalidatePath("/app/profil");
    return { active: false };
  } catch (error) {
    if (error instanceof UnauthenticatedError) return { error: "Authentification requise." };
    return { error: "Désactivation impossible." };
  }
}
