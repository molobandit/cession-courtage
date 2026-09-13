import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MailPayload = {
  to: string;
  subject: string;
  bodyText: string;
  purpose: string;
  /** Si fourni, un second envoi avec la même clef est un no-op. */
  dedupeKey?: string;
};

/**
 * Mailer port. Mock implementation stores messages in OutboundEmail.
 * Replace the body of `sendMail` with Resend/SMTP later without touching callers.
 */
export async function sendMail(payload: MailPayload): Promise<void> {
  if (payload.dedupeKey) {
    try {
      await prisma.outboundEmail.create({
        data: {
          to: payload.to,
          subject: payload.subject,
          bodyText: payload.bodyText,
          purpose: payload.purpose,
          dedupeKey: payload.dedupeKey,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return;
      }
      throw error;
    }
    return;
  }

  await prisma.outboundEmail.create({
    data: {
      to: payload.to,
      subject: payload.subject,
      bodyText: payload.bodyText,
      purpose: payload.purpose,
    },
  });
}

/**
 * Boîte de démonstration : les courriels simulés, liens de connexion compris.
 *
 * Elle n'existe que sur un poste de développement. Ouverte en ligne, elle
 * donnait à n'importe quel visiteur le lien de connexion de n'importe quel
 * compte, administrateur compris : il suffisait de le demander. La variable
 * d'environnement ne suffit donc pas, l'adresse de la requête doit être locale.
 */
export async function isDemoInboxEnabled(): Promise<boolean> {
  if (process.env.DEMO_INBOX !== "true") return false;
  try {
    const { headers } = await import("next/headers");
    const hote = ((await headers()).get("host") ?? "").split(":")[0]!.toLowerCase();
    return hote === "localhost" || hote === "127.0.0.1" || hote === "[::1]";
  } catch {
    return false;
  }
}

export async function findLatestDemoLink(email: string): Promise<string | null> {
  if (!(await isDemoInboxEnabled())) return null;
  const row = await prisma.outboundEmail.findFirst({
    where: { to: email, purpose: "MAGIC_LINK" },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  const match = row.bodyText.match(/https?:\/\/\S+/);
  return match?.[0] ?? null;
}
