import { describe, expect, it } from "vitest";
import { parisOffsetMinutes, parisWallToUtc } from "@/lib/booking/time";

describe("parisWallToUtc", () => {
  it("convertit une heure d’été (CEST, UTC+2)", () => {
    const instant = parisWallToUtc(2026, 9, 14, 9 * 60);
    expect(instant.toISOString()).toBe("2026-09-14T07:00:00.000Z");
    expect(parisOffsetMinutes(instant)).toBe(120);
  });

  it("convertit une heure d’hiver (CET, UTC+1)", () => {
    const instant = parisWallToUtc(2026, 1, 12, 9 * 60);
    expect(instant.toISOString()).toBe("2026-01-12T08:00:00.000Z");
    expect(parisOffsetMinutes(instant)).toBe(60);
  });
});
