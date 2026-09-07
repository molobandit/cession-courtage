import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/integrations/mailer";

const TTL_MS = 15 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueMagicLink(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always look like a success to the caller; skip send if unknown.
  if (!user) return;

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  const raw = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(raw),
      expires: new Date(Date.now() + TTL_MS),
    },
  });

  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const url = `${base}/connexion/magique?email=${encodeURIComponent(email)}&token=${raw}`;
  await sendMail({
    to: email,
    subject: "Votre lien de connexion — cession de portefeuilles",
    purpose: "MAGIC_LINK",
    bodyText: [
      "Bonjour,",
      "",
      "Voici votre lien de connexion (valable 15 minutes) :",
      url,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    ].join("\n"),
  });
}

export async function consumeMagicLinkToken(email: string, rawToken: string) {
  const hashed = hashToken(rawToken);
  const row = await prisma.verificationToken.findUnique({
    where: { token: hashed },
  });
  if (!row || row.identifier !== email) return null;
  if (row.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token: hashed } }).catch(() => undefined);
    return null;
  }
  await prisma.verificationToken.delete({ where: { token: hashed } });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (!user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }
  return user;
}
