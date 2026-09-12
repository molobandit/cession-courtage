import "server-only";
import { prisma } from "@/lib/prisma";

const DEFAULT_WINDOWS = [
  { weekday: 1, startMinutes: 540, endMinutes: 720 },
  { weekday: 2, startMinutes: 540, endMinutes: 720 },
  { weekday: 3, startMinutes: 540, endMinutes: 720 },
  { weekday: 4, startMinutes: 540, endMinutes: 720 },
  { weekday: 5, startMinutes: 540, endMinutes: 720 },
  { weekday: 1, startMinutes: 840, endMinutes: 1020 },
  { weekday: 2, startMinutes: 840, endMinutes: 1020 },
  { weekday: 3, startMinutes: 840, endMinutes: 1020 },
  { weekday: 4, startMinutes: 840, endMinutes: 1020 },
  { weekday: 5, startMinutes: 840, endMinutes: 1020 },
] as const;

export async function ensureAdvisorCalendar(): Promise<void> {
  const settings = await prisma.advisorCalendarSettings.findUnique({
    where: { id: "default" },
  });
  if (!settings) {
    await prisma.advisorCalendarSettings.create({ data: { id: "default" } });
  }
  const count = await prisma.advisorAvailability.count();
  if (count === 0) {
    await prisma.advisorAvailability.createMany({
      data: DEFAULT_WINDOWS.map((row) => ({ ...row })),
    });
  }
}
