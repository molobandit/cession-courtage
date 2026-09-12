import "server-only";
import { ensureAdvisorCalendar } from "@/lib/booking/ensure";
import { listOpenSlots, type OpenSlot } from "@/lib/booking/slots";
import { maybeRefreshIcs } from "@/lib/booking/sync-ics";
import { prisma } from "@/lib/prisma";

export async function loadOpenAdvisorSlots(now = new Date()): Promise<OpenSlot[]> {
  await ensureAdvisorCalendar();
  await maybeRefreshIcs(now);

  const [settings, windows, blocked, busy, bookings] = await Promise.all([
    prisma.advisorCalendarSettings.findUnique({ where: { id: "default" } }),
    prisma.advisorAvailability.findMany(),
    prisma.advisorBlockedDay.findMany(),
    prisma.advisorBusyBlock.findMany(),
    prisma.advisorBooking.findMany({
      where: { status: { not: "CANCELLED" }, endsAt: { gt: now } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  return listOpenSlots({
    now,
    horizonDays: settings?.horizonDays ?? 14,
    slotMinutes: settings?.slotMinutes ?? 30,
    bufferMinutes: settings?.bufferMinutes ?? 120,
    windows,
    blockedDates: blocked.map((row) => row.date),
    busy: [...busy, ...bookings],
  });
}

export async function slotStillOpen(startsAt: Date, now = new Date()): Promise<OpenSlot | null> {
  const slots = await loadOpenAdvisorSlots(now);
  return slots.find((slot) => slot.startsAt.getTime() === startsAt.getTime()) ?? null;
}
