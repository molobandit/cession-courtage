import { describe, expect, it } from "vitest";
import { listOpenSlots } from "@/lib/booking/slots";
import { parisWallToUtc } from "@/lib/booking/time";

describe("listOpenSlots", () => {
  const windows = [
    { weekday: 1, startMinutes: 9 * 60, endMinutes: 10 * 60 },
  ];

  it("propose des créneaux de 30 min dans la plage, hors occupation", () => {
    const now = parisWallToUtc(2026, 9, 13, 8 * 60); // dimanche
    const busyStart = parisWallToUtc(2026, 9, 14, 9 * 60);
    const busyEnd = parisWallToUtc(2026, 9, 14, 9 * 60 + 30);
    const slots = listOpenSlots({
      now,
      horizonDays: 3,
      slotMinutes: 30,
      bufferMinutes: 0,
      windows,
      blockedDates: [],
      busy: [{ startsAt: busyStart, endsAt: busyEnd }],
    });
    const monday = slots.filter((s) => s.startsAt.toISOString().startsWith("2026-09-14"));
    expect(monday.map((s) => s.startsAt.toISOString())).toEqual(["2026-09-14T07:30:00.000Z"]);
  });

  it("ignore un jour bloqué", () => {
    const now = parisWallToUtc(2026, 9, 13, 8 * 60);
    const slots = listOpenSlots({
      now,
      horizonDays: 3,
      slotMinutes: 30,
      bufferMinutes: 0,
      windows,
      blockedDates: ["2026-09-14"],
      busy: [],
    });
    expect(slots.filter((s) => s.startsAt.toISOString().startsWith("2026-09-14"))).toHaveLength(0);
  });
});
