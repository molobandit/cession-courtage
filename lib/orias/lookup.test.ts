import { describe, expect, it } from "vitest";
import { lookupOriasRegister, namesAlign, normalizeOriasNumber } from "@/lib/orias/lookup";

describe("lookup ORIAS", () => {
  it("exige huit chiffres", () => {
    expect(normalizeOriasNumber("1700 2001")).toBe("17002001");
    expect(normalizeOriasNumber("123")).toBeNull();
  });

  it("rapproche les formes sociales sans exiger une égalité stricte", () => {
    expect(namesAlign("Cabinet Dupont SAS", "CABINET DUPONT")).toBe(true);
    expect(namesAlign("Dupont", "Martin Courtage")).toBe(false);
  });

  it("classe NOT_FOUND, MATCH et UNAVAILABLE selon la réponse du registre", async () => {
    const missing = await lookupOriasRegister(
      { oriasNumber: "17002001", legalName: "Expansion" },
      async () => new Response("", { status: 404 }),
    );
    expect(missing.status).toBe("NOT_FOUND");

    const match = await lookupOriasRegister(
      { oriasNumber: "17002001", legalName: "Expansion Courtage", siren: "890130001" },
      async () =>
        new Response(JSON.stringify({ denomination: "Expansion Courtage SAS", siren: "890130001" }), {
          status: 200,
        }),
    );
    expect(match.status).toBe("MATCH");

    const down = await lookupOriasRegister({ oriasNumber: "17002001" }, async () => {
      throw new Error("network");
    });
    expect(down.status).toBe("UNAVAILABLE");
  });
});
