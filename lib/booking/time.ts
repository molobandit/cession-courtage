/** Fuseau unique de l’agenda conseiller. */
export const ADVISOR_TZ = "Europe/Paris";

const WEEKDAY_ISO: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

type ParisParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekdayIso: number;
};

function parisParts(instant: Date): ParisParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: ADVISOR_TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(instant)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    weekdayIso: WEEKDAY_ISO[bag.weekday] ?? 1,
  };
}

/** Décalage Paris par rapport à UTC, en minutes (été = 120). */
export function parisOffsetMinutes(instant: Date): number {
  const p = parisParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return (asUtc - instant.getTime()) / 60000;
}

/** Instant UTC correspondant à une heure murale à Paris. */
export function parisWallToUtc(
  year: number,
  month: number,
  day: number,
  minutesFromMidnight: number,
): Date {
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = parisOffsetMinutes(guess);
  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute) - offset * 60000);
  const again = parisOffsetMinutes(utc);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - again * 60000);
}

export function parisDateKey(instant: Date): string {
  const p = parisParts(instant);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function addParisDays(year: number, month: number, day: number, days: number): {
  year: number;
  month: number;
  day: number;
} {
  const utc = Date.UTC(year, month - 1, day + days);
  const d = new Date(utc);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function parisWeekdayIso(year: number, month: number, day: number): number {
  return parisParts(parisWallToUtc(year, month, day, 12 * 60)).weekdayIso;
}

export function formatParisSlot(startsAt: Date, endsAt: Date): { dayLabel: string; timeLabel: string } {
  const day = new Intl.DateTimeFormat("fr-FR", {
    timeZone: ADVISOR_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(startsAt);
  const start = new Intl.DateTimeFormat("fr-FR", {
    timeZone: ADVISOR_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(startsAt);
  const end = new Intl.DateTimeFormat("fr-FR", {
    timeZone: ADVISOR_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(endsAt);
  return {
    dayLabel: day.charAt(0).toUpperCase() + day.slice(1),
    timeLabel: `${start} – ${end}`,
  };
}

export function minutesFromHm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function hmFromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};
