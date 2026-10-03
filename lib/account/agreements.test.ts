import { describe, expect, it } from "vitest";
import { AGREEMENT_VERSION, agreementsStatus, buildIntermediationContract, buildPlatformNda } from "@/lib/account/agreements";

const T = new Date("2026-09-14T10:00:00Z");
const row = (kind: string, oriasNumber = "17001005", version = AGREEMENT_VERSION) => ({ kind, version, oriasNumber, signedAt: T });

describe("engagements signés une fois par cycle ORIAS", () => {
  it("valent quand les deux textes sont signés sous l’ORIAS actuel", () => {
    expect(agreementsStatus([row("NDA"), row("INTERMEDIATION")], "17001005").valid).toBe(true);
  });

  it("tombent avec un nouveau numéro ORIAS ou une nouvelle version", () => {
    expect(agreementsStatus([row("NDA"), row("INTERMEDIATION")], "18009999").valid).toBe(false);
    expect(agreementsStatus([row("NDA", "17001005", "2025-01"), row("INTERMEDIATION")], "17001005").missing).toEqual(["NDA"]);
  });

  it("disent ce qui manque", () => {
    expect(agreementsStatus([row("NDA")], "17001005").missing).toEqual(["INTERMEDIATION"]);
    expect(agreementsStatus([], null).valid).toBe(false);
  });

  it("nomment le cabinet et l’ORIAS sous lequel ils valent", () => {
    const party = { legalName: "Nord Assur Pro", legalForm: "EURL", siren: "890120005", address: "8 rue Faidherbe", postalCode: "59000", city: "Lille", oriasNumber: "17001005", representative: "Claire Dubois", jobTitle: "Gérante", email: null };
    const nda = JSON.stringify(buildPlatformNda(party, "17001005", T));
    const contrat = JSON.stringify(buildIntermediationContract(party, "17001005", T));
    for (const texte of [nda, contrat]) {
      expect(texte).toContain("Nord Assur Pro");
      expect(texte).toContain("17001005");
    }
    expect(contrat).toContain("n’emporte pas d’honoraires de dépôt");
  });
});
