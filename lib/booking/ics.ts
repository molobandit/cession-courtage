import { parisWallToUtc } from "@/lib/booking/time";

export type IcsEvent = {
  uid: string;
  startsAt: Date;
  endsAt: Date;
};

function unfold(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function unescapeIcs(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseUtcStamp(value: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
}

function parseLocalStamp(value: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(value);
  if (!m) return null;
  return parisWallToUtc(+m[1], +m[2], +m[3], +m[4] * 60 + +m[5]);
}

function parseDateValue(value: string, end: boolean): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  if (end) {
    return parisWallToUtc(y, mo, d, 0);
  }
  return parisWallToUtc(y, mo, d, 0);
}

function fieldValue(line: string): { name: string; params: string; value: string } | null {
  const idx = line.indexOf(":");
  if (idx < 0) return null;
  const left = line.slice(0, idx);
  const value = unescapeIcs(line.slice(idx + 1));
  const [name, ...rest] = left.split(";");
  return { name: name.toUpperCase(), params: rest.join(";").toUpperCase(), value };
}

/**
 * Parseur iCal minimal (VEVENT). Suffisant pour un flux Google / Outlook :
 * DTSTART/DTEND UTC, heure locale, ou journée entière.
 */
export function parseIcsEvents(raw: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: { uid?: string; start?: Date; end?: Date; allDay?: boolean } | null = null;

  for (const line of unfold(raw)) {
    const field = fieldValue(line);
    if (!field) continue;

    if (field.name === "BEGIN" && field.value === "VEVENT") {
      current = {};
      continue;
    }
    if (!current) continue;

    if (field.name === "END" && field.value === "VEVENT") {
      if (current.start && current.end && current.end > current.start) {
        events.push({
          uid: current.uid ?? `${current.start.toISOString()}-${current.end.toISOString()}`,
          startsAt: current.start,
          endsAt: current.end,
        });
      }
      current = null;
      continue;
    }

    if (field.name === "UID") {
      current.uid = field.value.trim();
      continue;
    }

    if (field.name === "DTSTART" || field.name === "DTEND") {
      const isEnd = field.name === "DTEND";
      const dateValue = field.params.includes("VALUE=DATE");
      let instant: Date | null = null;
      if (dateValue || /^\d{8}$/.test(field.value)) {
        instant = parseDateValue(field.value, false);
        if (instant && isEnd) {
          instant = new Date(instant.getTime());
        }
        current.allDay = true;
        if (isEnd && instant) {
          // DTEND journée entière est exclusif (lendemain 00:00).
          current.end = instant;
        } else if (instant) {
          current.start = instant;
        }
        continue;
      }
      instant = field.value.endsWith("Z") ? parseUtcStamp(field.value) : parseLocalStamp(field.value);
      if (!instant) continue;
      if (isEnd) current.end = instant;
      else current.start = instant;
    }
  }

  return events;
}
