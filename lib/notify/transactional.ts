import "server-only";
import { NotificationType } from "@prisma/client";
import { sendMail } from "@/lib/integrations/mailer";
import { offerReceivedCopy } from "@/lib/notify/copy";
import { prisma } from "@/lib/prisma";
import { BRAND_NAME } from "@/lib/site";

const SIGNUP_DELAY = "sous deux jours ouvrés, en pratique souvent le lendemain";

async function adminInbox(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", erasedAt: null },
    select: { email: true },
    orderBy: { createdAt: "asc" },
  });
  return admin?.email ?? null;
}

async function notifyInApp(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
}) {
  await prisma.notification.create({ data: input });
}

export async function notifySignupReceived(input: {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
}): Promise<void> {
  const who = input.fullName?.trim() || input.email;
  await sendMail({
    to: input.email,
    purpose: "SIGNUP_USER",
    dedupeKey: `signup:user:${input.userId}`,
    subject: `Inscription reçue — ${BRAND_NAME}`,
    bodyText: [
      `Bonjour${input.fullName ? ` ${input.fullName}` : ""},`,
      "",
      `Votre compte ${BRAND_NAME} est créé. Pour un courtier, l’espace membre s’ouvre après vérification du numéro ORIAS (${SIGNUP_DELAY}). Un investisseur accède tout de suite au suivi des dossiers sous alias.`,
      "",
      "Aucun paiement n’est demandé à cette étape.",
      "",
      `— ${BRAND_NAME}`,
    ].join("\n"),
  });

  const adminTo = await adminInbox();
  if (adminTo) {
    await sendMail({
      to: adminTo,
      purpose: "SIGNUP_ADMIN",
      dedupeKey: `signup:admin:${input.userId}`,
      subject: `Nouvelle inscription à valider — ${who}`,
      bodyText: [
        "Une inscription attend une décision.",
        "",
        `Nom : ${who}`,
        `E-mail : ${input.email}`,
        `Rôle : ${input.role}`,
        "",
        "Espace admin : /admin/orias",
      ].join("\n"),
    });
  }

  await notifyInApp({
    userId: input.userId,
    type: NotificationType.SIGNUP,
    title: "Inscription reçue",
    body: "Votre compte est créé. La validation ORIAS, le cas échéant, est en cours.",
    href: "/en-attente-orias",
  });
}

export async function notifyOriasDecision(input: {
  userId: string;
  email: string;
  fullName: string | null;
  approved: boolean;
  reason?: string;
}): Promise<void> {
  const greeting = input.fullName ? `Bonjour ${input.fullName},` : "Bonjour,";
  if (input.approved) {
    await sendMail({
      to: input.email,
      purpose: "ORIAS_APPROVED",
      dedupeKey: `orias:approved:${input.userId}`,
      subject: `ORIAS validé — ${BRAND_NAME}`,
      bodyText: [
        greeting,
        "",
        "Votre numéro ORIAS a été validé. L’espace membre est ouvert.",
        "",
        `— ${BRAND_NAME}`,
      ].join("\n"),
    });
    await notifyInApp({
      userId: input.userId,
      type: NotificationType.ORIAS_DECISION,
      title: "ORIAS validé",
      body: "Vous pouvez entrer dans l’espace membre.",
      href: "/app",
    });
    return;
  }

  const reason = input.reason?.trim() || "Motif non précisé.";
  await sendMail({
    to: input.email,
    purpose: "ORIAS_REJECTED",
    dedupeKey: `orias:rejected:${input.userId}`,
    subject: `ORIAS refusé — ${BRAND_NAME}`,
    bodyText: [
      greeting,
      "",
      "La vérification de votre numéro ORIAS n’a pas abouti.",
      "",
      `Motif : ${reason}`,
      "",
      `— ${BRAND_NAME}`,
    ].join("\n"),
  });
  await notifyInApp({
    userId: input.userId,
    type: NotificationType.ORIAS_DECISION,
    title: "ORIAS refusé",
    body: reason,
    href: "/en-attente-orias",
  });
}

export async function notifyOfferReceived(input: {
  offerId: string;
  sellerUserId: string;
  sellerEmail: string;
  publicNumber: number;
  sealed: boolean;
}): Promise<void> {
  const copy = offerReceivedCopy(input);
  await sendMail({
    to: input.sellerEmail,
    purpose: "OFFER_RECEIVED",
    dedupeKey: `offer:${input.offerId}:seller`,
    subject: copy.subject,
    bodyText: copy.bodyText,
  });
  await notifyInApp({
    userId: input.sellerUserId,
    type: NotificationType.OFFER_RECEIVED,
    title: "Offre reçue",
    body: input.sealed
      ? `Dossier n° ${input.publicNumber}. Le montant reste masqué jusqu’à la clôture.`
      : `Dossier n° ${input.publicNumber}. Vous pouvez comparer les offres.`,
    href: `/app/annonces`,
  });
}

export async function notifyDepositPlaced(input: {
  depositKey: string;
  publicNumber: number;
  amountLabel: string;
  seller: { userId: string; email: string };
  counterparty: { userId: string; email: string };
}): Promise<void> {
  const body = [
    `Un dépôt de ${input.amountLabel} a été posé sur le dossier n° ${input.publicNumber}.`,
    "Les coordonnées du cabinet cédant sont désormais ouvertes entre les parties.",
    "",
    `— ${BRAND_NAME}`,
  ].join("\n");

  await sendMail({
    to: input.seller.email,
    purpose: "DEPOSIT_PLACED",
    dedupeKey: `deposit:${input.depositKey}:seller`,
    subject: `Dépôt posé — dossier n° ${input.publicNumber}`,
    bodyText: body,
  });
  await sendMail({
    to: input.counterparty.email,
    purpose: "DEPOSIT_PLACED",
    dedupeKey: `deposit:${input.depositKey}:counterparty`,
    subject: `Dépôt posé — dossier n° ${input.publicNumber}`,
    bodyText: body,
  });
  await notifyInApp({
    userId: input.seller.userId,
    type: NotificationType.DEPOSIT_PLACED,
    title: "Dépôt de 2,5 % posé",
    body: `Dossier n° ${input.publicNumber}. Les coordonnées du cabinet sont ouvertes.`,
    href: `/annonces/${input.publicNumber}`,
  });
  await notifyInApp({
    userId: input.counterparty.userId,
    type: NotificationType.DEPOSIT_PLACED,
    title: "Dépôt de 2,5 % posé",
    body: `Dossier n° ${input.publicNumber}. Les coordonnées du cabinet sont ouvertes.`,
    href: `/annonces/${input.publicNumber}`,
  });
}

const PURPOSE_LABEL: Record<string, string> = {
  DEPOSIT: "Déposer un portefeuille",
  BUY: "Acheter / se renseigner",
  OTHER: "Autre",
};

export async function notifyAdvisorBooking(input: {
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  fullName: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  purpose: string;
  note: string | null;
}): Promise<void> {
  const { formatParisSlot } = await import("@/lib/booking/time");
  const slot = formatParisSlot(input.startsAt, input.endsAt);
  const when = `${slot.dayLabel}, ${slot.timeLabel}`;
  const purpose = PURPOSE_LABEL[input.purpose] ?? input.purpose;

  await sendMail({
    to: input.email,
    purpose: "ADVISOR_BOOKING_USER",
    dedupeKey: `advisor:user:${input.bookingId}`,
    subject: `Entretien confirmé — ${when}`,
    bodyText: [
      `Bonjour ${input.fullName},`,
      "",
      `Votre entretien de 30 minutes avec un conseiller ${BRAND_NAME} est réservé.`,
      "",
      `Quand : ${when} (heure de Paris).`,
      `Objet : ${purpose}.`,
      "",
      "Si vous devez décaler, répondez à ce message.",
      "",
      `— ${BRAND_NAME}`,
    ].join("\n"),
  });

  const adminTo = await adminInbox();
  if (adminTo) {
    await sendMail({
      to: adminTo,
      purpose: "ADVISOR_BOOKING_ADMIN",
      dedupeKey: `advisor:admin:${input.bookingId}`,
      subject: `Entretien réservé — ${input.fullName} — ${when}`,
      bodyText: [
        "Un entretien conseiller a été réservé sur le site.",
        "",
        `Quand : ${when} (heure de Paris)`,
        `Nom : ${input.fullName}`,
        `E-mail : ${input.email}`,
        `Téléphone : ${input.phone ?? "Non renseigné"}`,
        `Cabinet : ${input.organisation ?? "Non renseigné"}`,
        `Objet : ${purpose}`,
        ...(input.note ? [`Message : ${input.note}`] : []),
        "",
        "Agenda : /admin/agenda",
      ].join("\n"),
    });
  }
}

export async function findFirmSeller(firmId: string): Promise<{ id: string; email: string } | null> {
  return prisma.user.findFirst({
    where: { firmId, role: { in: ["SELLER", "BOTH"] }, erasedAt: null },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });
}
