import "server-only";
import { parseIcsEvents } from "@/lib/booking/ics";
import { prisma } from "@/lib/prisma";

const MAX_EVENTS = 400;

export async function syncAdvisorIcs(now = new Date()): Promise<{ ok: boolean; count: number; error?: string }> {
  const settings = await prisma.advisorCalendarSettings.findUnique({
    where: { id: "default" },
  });
  const url = settings?.icsUrl?.trim();
  if (!url) {
    await prisma.advisorBusyBlock.deleteMany({ where: { source: "ICS" } });
    await prisma.advisorCalendarSettings.update({
      where: { id: "default" },
      data: { lastSyncAt: now, lastSyncError: null },
    });
    return { ok: true, count: 0 };
  }

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { Accept: "text/calendar, text/plain, */*" },
    });
    if (!response.ok) {
      throw new Error(`Calendrier injoignable (${response.status}).`);
    }
    const raw = await response.text();
    const events = parseIcsEvents(raw)
      .filter((event) => event.endsAt > now)
      .slice(0, MAX_EVENTS);

    await prisma.advisorBusyBlock.deleteMany({ where: { source: "ICS" } });
    if (events.length > 0) {
      await prisma.advisorBusyBlock.createMany({
        data: events.map((event) => ({
          uid: event.uid.slice(0, 180),
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          source: "ICS",
        })),
      });
    }

    await prisma.advisorCalendarSettings.update({
      where: { id: "default" },
      data: { lastSyncAt: now, lastSyncError: null },
    });
    return { ok: true, count: events.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Synchronisation impossible.";
    await prisma.advisorCalendarSettings.update({
      where: { id: "default" },
      data: { lastSyncAt: now, lastSyncError: message },
    });
    return { ok: false, count: 0, error: message };
  }
}

export async function maybeRefreshIcs(now = new Date()): Promise<void> {
  const settings = await prisma.advisorCalendarSettings.findUnique({
    where: { id: "default" },
    select: { icsUrl: true, lastSyncAt: true },
  });
  if (!settings?.icsUrl) return;
  const stale =
    !settings.lastSyncAt || now.getTime() - settings.lastSyncAt.getTime() > 30 * 60_000;
  if (stale) await syncAdvisorIcs(now);
}
