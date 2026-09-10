import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/integrations/mailer";
import { enregistrerEchec, effacerEchecs, verrouActif } from "@/lib/auth/throttle";

const TTL_MS = 15 * 60 * 1000;
const OTP_PREFIX = "otp:";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function otpIdentifier(email: string): string {
  return `${OTP_PREFIX}${email}`;
}

function lienIdentifier(email: string): string {
  return `lien:${email}`;
}

/** Six chiffres, tirés du CSPRNG. Jamais d'incrément prévisible. */
export function generateEmailCode(): string {
  const bytes = randomBytes(4);
  const n = bytes.readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

function isEmailCode(raw: string): boolean {
  return /^\d{6}$/.test(raw);
}

export async function issueMagicLink(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Toujours un succes apparent : un e-mail inconnu ne doit pas se distinguer.
  if (!user) return;

  if (await verrouActif(lienIdentifier(email))) return;

  await prisma.verificationToken.deleteMany({
    where: { identifier: { in: [email, otpIdentifier(email)] } },
  });

  const raw = randomBytes(32).toString("hex");
  const code = generateEmailCode();
  const expires = new Date(Date.now() + TTL_MS);

  await prisma.verificationToken.create({
    data: { identifier: email, token: hashToken(raw), expires },
  });
  await prisma.verificationToken.create({
    data: { identifier: otpIdentifier(email), token: hashToken(code), expires },
  });

  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const url = `${base}/connexion/magique?email=${encodeURIComponent(email)}&token=${raw}`;
  await sendMail({
    to: email,
    subject: "Votre code de connexion — Le Bon Portefeuille",
    purpose: "MAGIC_LINK",
    bodyText: [
      "Bonjour,",
      "",
      `Votre code de connexion : ${code}`,
      "Il est valable 15 minutes.",
      "",
      "Vous pouvez aussi ouvrir ce lien :",
      url,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    ].join("\n"),
  });

  // Compte les envois pour ralentir le bombardement de boites, sans jamais
  // dire si le compte existe.
  await enregistrerEchec(lienIdentifier(email));
}

export async function consumeMagicLinkToken(email: string, rawToken: string) {
  const trimmed = rawToken.trim();
  if (isEmailCode(trimmed)) {
    if (await verrouActif(otpIdentifier(email))) return null;
    const user = await consumeHashed(otpIdentifier(email), trimmed, email);
    if (!user) {
      await enregistrerEchec(otpIdentifier(email));
      return null;
    }
    await effacerEchecs(otpIdentifier(email));
    await effacerEchecs(lienIdentifier(email));
    return user;
  }

  const user = await consumeHashed(email, trimmed, email);
  if (!user) return null;
  await prisma.verificationToken.deleteMany({ where: { identifier: otpIdentifier(email) } });
  await effacerEchecs(lienIdentifier(email));
  await effacerEchecs(otpIdentifier(email));
  return user;
}

async function consumeHashed(identifier: string, raw: string, email: string) {
  const hashed = hashToken(raw);
  const row = await prisma.verificationToken.findUnique({
    where: { token: hashed },
  });
  if (!row || row.identifier !== identifier) return null;
  if (row.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token: hashed } }).catch(() => undefined);
    return null;
  }
  await prisma.verificationToken.deleteMany({
    where: { identifier: { in: [email, otpIdentifier(email)] } },
  });
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
