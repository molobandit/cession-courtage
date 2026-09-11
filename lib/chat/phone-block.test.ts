import { describe, expect, it } from "vitest";
import { containsFrenchMobile, offPlatformPhoneError } from "@/lib/chat/phone-block";

describe("containsFrenchMobile", () => {
  it("détecte un 06 et un 07, même séparés", () => {
    expect(containsFrenchMobile("appelez le 06 12 34 56 78")).toBe(true);
    expect(containsFrenchMobile("mon 07.11.22.33.44")).toBe(true);
    expect(containsFrenchMobile("+33612345678")).toBe(true);
    expect(containsFrenchMobile("00 33 6 12 34 56 78")).toBe(true);
  });

  it("laisse passer un dossier, une zone ou un fixe", () => {
    expect(containsFrenchMobile("Dossier n° 10006")).toBe(false);
    expect(containsFrenchMobile("zone 06 Alpes-Maritimes")).toBe(false);
    expect(containsFrenchMobile("01 42 00 00 00")).toBe(false);
    expect(containsFrenchMobile("Quelle est la répartition par compagnie ?")).toBe(false);
  });

  it("explique le refus", () => {
    expect(offPlatformPhoneError("06 12 34 56 78")?.includes("portable")).toBe(true);
    expect(offPlatformPhoneError("Bonjour")).toBeNull();
  });
});
