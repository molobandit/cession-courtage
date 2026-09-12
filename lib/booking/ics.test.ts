import { describe, expect, it } from "vitest";
import { parseIcsEvents } from "@/lib/booking/ics";

describe("parseIcsEvents", () => {
  it("lit un VEVENT UTC", () => {
    const events = parseIcsEvents(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:abc-1
DTSTART:20260914T070000Z
DTEND:20260914T073000Z
END:VEVENT
END:VCALENDAR`);
    expect(events).toHaveLength(1);
    expect(events[0]?.uid).toBe("abc-1");
    expect(events[0]?.startsAt.toISOString()).toBe("2026-09-14T07:00:00.000Z");
    expect(events[0]?.endsAt.toISOString()).toBe("2026-09-14T07:30:00.000Z");
  });

  it("lit une heure locale Paris", () => {
    const events = parseIcsEvents(`BEGIN:VEVENT
UID:local-1
DTSTART:20260914T090000
DTEND:20260914T100000
END:VEVENT`);
    expect(events[0]?.startsAt.toISOString()).toBe("2026-09-14T07:00:00.000Z");
    expect(events[0]?.endsAt.toISOString()).toBe("2026-09-14T08:00:00.000Z");
  });

  it("bloque une journée entière (DTEND exclusif)", () => {
    const events = parseIcsEvents(`BEGIN:VEVENT
UID:day-1
DTSTART;VALUE=DATE:20260915
DTEND;VALUE=DATE:20260916
END:VEVENT`);
    expect(events[0]?.startsAt.toISOString()).toBe("2026-09-14T22:00:00.000Z");
    expect(events[0]?.endsAt.toISOString()).toBe("2026-09-15T22:00:00.000Z");
  });
});
