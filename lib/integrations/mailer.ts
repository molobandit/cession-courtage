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

export function isDemoInboxEnabled(): boolean {
  return process.env.DEMO_INBOX === "true";
}

export async function findLatestDemoLink(email: string): Promise<string | null> {
  if (!isDemoInboxEnabled()) return null;
  const row = await prisma.outboundEmail.findFirst({
    where: { to: email, purpose: "MAGIC_LINK" },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  const match = row.bodyText.match(/https?:\/\/\S+/);
  return match?.[0] ?? null;
}
