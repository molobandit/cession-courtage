import { addParisDays, parisDateKey, parisWallToUtc, parisWeekdayIso } from "@/lib/booking/time";

export type BusyInterval = { startsAt: Date; endsAt: Date };

export type SlotWindow = {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
};

export type OpenSlot = {
  startsAt: Date;
  endsAt: Date;
};

function overlaps(a0: Date, a1: Date, b0: Date, b1: Date): boolean {
  return a0.getTime() < b1.getTime() && b0.getTime() < a1.getTime();
}

export function listOpenSlots(input: {
  now: Date;
  horizonDays: number;
  slotMinutes: number;
  bufferMinutes: number;
  windows: SlotWindow[];
  blockedDates: string[];
  busy: BusyInterval[];
}): OpenSlot[] {
  if (input.slotMinutes <= 0) return [];
  const startFloor = new Date(input.now.getTime() + input.bufferMinutes * 60_000);
  const origin = parisDateKey(input.now);
  const [y0, m0, d0] = origin.split("-").map(Number);
  const blocked = new Set(input.blockedDates);
  const slots: OpenSlot[] = [];

  for (let i = 0; i < input.horizonDays; i += 1) {
    const day = addParisDays(y0, m0, d0, i);
    const key = `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
    if (blocked.has(key)) continue;
    const weekday = parisWeekdayIso(day.year, day.month, day.day);
    const ranges = input.windows.filter((w) => w.weekday === weekday);
    for (const range of ranges) {
      for (
        let minute = range.startMinutes;
        minute + input.slotMinutes <= range.endMinutes;
        minute += input.slotMinutes
      ) {
        const startsAt = parisWallToUtc(day.year, day.month, day.day, minute);
        const endsAt = parisWallToUtc(day.year, day.month, day.day, minute + input.slotMinutes);
        if (startsAt < startFloor) continue;
        const taken = input.busy.some((block) => overlaps(startsAt, endsAt, block.startsAt, block.endsAt));
        if (taken) continue;
        slots.push({ startsAt, endsAt });
      }
    }
  }

  return slots;
}
