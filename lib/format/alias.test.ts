import { describe, expect, it } from "vitest";
import { demandName, dossierName, partyName } from "@/lib/format/alias";

describe("libellés publics", () => {
  it("nomme un dossier sans dièse", () => {
    expect(dossierName(10005)).toBe("Dossier n° 10005");
  });

  it("nomme une demande sans dièse", () => {
    expect(demandName(42)).toBe("Demande n° 42");
  });

  it("nomme les parties sans dièse", () => {
    expect(partyName("buyer", "#A54")).toBe("Acquéreur A54");
    expect(partyName("seller", "C41")).toBe("Cédant C41");
  });
});
