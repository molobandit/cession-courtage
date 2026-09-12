"use server";

import { Prisma } from "@prisma/client";
import { slotStillOpen } from "@/lib/booking/load";
import { prisma } from "@/lib/prisma";
import { notifyAdvisorBooking } from "@/lib/notify/transactional";
import { advisorBookingSchema, firstIssue } from "@/lib/validations/actions";

export type AdvisorBookingState = { error?: string; ok?: boolean };

export async function createAdvisorBookingAction(
  _prev: AdvisorBookingState,
  formData: FormData,
): Promise<AdvisorBookingState> {
  const parsed = advisorBookingSchema.safeParse({
    startsAt: formData.get("startsAt"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    organisation: formData.get("organisation") ?? "",
    purpose: formData.get("purpose"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const startsAt = new Date(parsed.data.startsAt);
  const slot = await slotStillOpen(startsAt);
  if (!slot) {
    return { error: "Ce créneau n’est plus disponible. Choisissez-en un autre." };
  }

  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const recent = await prisma.advisorBooking.count({
    where: {
      email: parsed.data.email.toLowerCase(),
      createdAt: { gte: since },
      status: { not: "CANCELLED" },
    },
  });
  if (recent >= 3) {
    return { error: "Trois entretiens sont déjà réservés avec cette adresse. Écrivez-nous pour en ajouter un." };
  }

  try {
    const booking = await prisma.advisorBooking.create({
      data: {
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "CONFIRMED",
        fullName: parsed.data.fullName,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone ?? null,
        organisation: parsed.data.organisation ?? null,
        purpose: parsed.data.purpose,
        note: parsed.data.note ?? null,
      },
    });
    await notifyAdvisorBooking({
      bookingId: booking.id,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      fullName: booking.fullName,
      email: booking.email,
      phone: booking.phone,
      organisation: booking.organisation,
      purpose: booking.purpose,
      note: booking.note,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ce créneau vient d’être pris. Choisissez-en un autre." };
    }
    throw error;
  }
}
