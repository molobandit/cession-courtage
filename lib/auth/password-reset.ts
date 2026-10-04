import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { BRAND_NAME } from "@/lib/site";
import { sendMail } from "@/lib/integrations/mailer";
import { hashPassword } from "@/lib/auth/password";
import { effacerEchecs, enregistrerEchec, verrouActif } from "@/lib/auth/throttle";

/**
 * Réinitialisation du mot de passe.
 *
 * Même mécanique que le code de connexion : un jeton tiré du CSPRNG, stocké
 * haché, valable une heure et consommé une seule fois. Deux précautions de
 * plus, parce qu'un lien de réinitialisation ouvre davantage qu'une session.
 *
 * Un e-mail inconnu obtient la même réponse qu'un e-mail connu : sans cela, le
 * formulaire dirait qui est inscrit. Et la demande est comptée, pour qu'on ne
 * puisse pas inonder une boîte en rejouant l'envoi.
 */

const TTL_MS = 60 * 60 * 1000;
const PREFIX = "reset:";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function identifier(email: string): string {
  return `${PREFIX}${email}`;
}

/** Durée de validité, dite à l'utilisateur dans ses mots. */
export const RESET_TTL_LABEL = "une heure";

export async function issuePasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, erasedAt: true } });
  // Toujours un succès apparent : un e-mail inconnu ne doit pas se distinguer.
  if (!user || user.erasedAt) return;
  if (await verrouActif(identifier(email))) return;

  await prisma.verificationToken.deleteMany({ where: { identifier: identifier(email) } });

  const raw = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier: identifier(email), token: hashToken(raw), expires: new Date(Date.now() + TTL_MS) },
  });

  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const url = `${base}/connexion/mot-de-passe/nouveau?email=${encodeURIComponent(email)}&token=${raw}`;
  await sendMail({
    to: email,
    subject: `Réinitialiser votre mot de passe · ${BRAND_NAME}`,
    purpose: "PASSWORD_RESET",
    bodyText: [
      "Bonjour,",
      "",
      "Vous avez demandé à choisir un nouveau mot de passe. Ouvrez ce lien :",
      url,
      "",
      `Il est valable ${RESET_TTL_LABEL}, et ne sert qu'une fois.`,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre",
      "mot de passe actuel reste valable.",
    ].join("\n"),
  });

  await enregistrerEchec(identifier(email));
}

/** Le jeton est-il encore bon ? Lecture seule, pour afficher le formulaire. */
export async function checkPasswordResetToken(email: string, rawToken: string): Promise<boolean> {
  const row = await prisma.verificationToken.findFirst({
    where: { identifier: identifier(email), token: hashToken(rawToken.trim()) },
    select: { expires: true },
  });
  return Boolean(row && row.expires.getTime() > Date.now());
}

/**
 * Pose le nouveau mot de passe, et brûle le jeton.
 *
 * Le jeton est supprimé avant l'écriture : un lien rejoué ne peut pas poser un
 * second mot de passe. Les compteurs d'échecs du compte sont remis à zéro, le
 * propriétaire venant de prouver qu'il lit sa boîte.
 */
export async function consumePasswordReset(
  email: string,
  rawToken: string,
  plainPassword: string,
): Promise<boolean> {
  const token = hashToken(rawToken.trim());
  const row = await prisma.verificationToken.findFirst({
    where: { identifier: identifier(email), token },
    select: { expires: true },
  });
  if (!row || row.expires.getTime() <= Date.now()) return false;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, erasedAt: true } });
  if (!user || user.erasedAt) return false;

  await prisma.verificationToken.deleteMany({ where: { identifier: identifier(email) } });
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(plainPassword) },
  });
  await effacerEchecs(email);
  await effacerEchecs(identifier(email));
  return true;
}
