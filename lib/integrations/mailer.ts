import "server-only";
import { prisma } from "@/lib/prisma";

export type MailPayload = {
  to: string;
  subject: string;
  bodyText: string;
  purpose: string;
};

/**
 * Mailer port. Mock implementation stores messages in OutboundEmail.
 * Replace the body of `sendMail` with Resend/SMTP later without touching callers.
 */
export async function sendMail(payload: MailPayload): Promise<void> {
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
