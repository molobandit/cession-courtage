import { describe, expect, it } from "vitest";
import {
  carriersEditable,
  carriersToLines,
  countByFilter,
  feesTtcCents,
  listParams,
  priceRequired,
  serviceBySlug,
  matchesFilter,
  parseCarrierLines,
  presetServices,
  readTransferCarriers,
  serviceByKey,
  transferBlockers,
} from "@/lib/direct/services";

const KIT = { kit: true, escrow: false, attestations: false };
const SEQUESTRE = { kit: false, escrow: true, attestations: false };
const ATTESTATIONS = { kit: false, escrow: false, attestations: true };

describe("portes d’entrée", () => {
  it("coche le seul service demandé", () => {
    expect(presetServices(serviceByKey("escrow"))).toEqual(SEQUESTRE);
    expect(presetServices(serviceByKey("attestations"))).toEqual(ATTESTATIONS);
  });

  it("propose le kit quand on arrive sans service précis", () => {
    expect(presetServices(serviceByKey("inconnu"))).toEqual(KIT);
  });
});

describe("listes de dossiers", () => {
  it("range un kit parmi les attestations, puisqu’il en produit", () => {
    expect(matchesFilter(KIT, "attestations")).toBe(true);
    expect(matchesFilter(SEQUESTRE, "attestations")).toBe(false);
  });

  it("compte chaque liste séparément", () => {
    expect(countByFilter([KIT, SEQUESTRE, ATTESTATIONS, { kit: true, escrow: true, attestations: false }])).toEqual({
      kits: 2,
      transactions: 2,
      attestations: 3,
    });
  });
});

describe("honoraires TTC", () => {
  it("ajoute la TVA et arrondit au centime", () => {
    expect(feesTtcCents(89)).toBe(10_680);
    expect(feesTtcCents(3_990)).toBe(478_800);
  });

  it("n’encaisse rien sur un total nul ou invalide", () => {
    expect(feesTtcCents(0)).toBe(0);
    expect(feesTtcCents(Number.NaN)).toBe(0);
  });
});

describe("compagnies à transférer", () => {
  it("lit une ligne par compagnie, code après un point-virgule ou une tabulation", () => {
    expect(parseCarrierLines("AXA ; 123456\nGenerali\t98-7\n\nAlptis")).toEqual([
      { name: "AXA", code: "123456" },
      { name: "Generali", code: "98-7" },
      { name: "Alptis", code: "" },
    ]);
  });

  it("ignore les doublons et les lignes trop courtes", () => {
    expect(parseCarrierLines("AXA;1\naxa;2\nX")).toEqual([{ name: "AXA", code: "1" }]);
  });

  it("relit le JSON stocké et survit à une valeur abîmée", () => {
    expect(readTransferCarriers('[{"name":"AXA","code":"1"}]')).toEqual([{ name: "AXA", code: "1" }]);
    expect(readTransferCarriers("pas du json")).toEqual([]);
    expect(readTransferCarriers(null)).toEqual([]);
  });

  it("fait l’aller-retour avec le champ de saisie", () => {
    const liste = [{ name: "AXA", code: "1" }, { name: "Alptis", code: "" }];
    expect(parseCarrierLines(carriersToLines(liste))).toEqual(liste);
  });

  it("se fige à l’étape des attestations", () => {
    expect(carriersEditable("SIGNATURE", KIT)).toBe(true);
    expect(carriersEditable("TRANSFER", KIT)).toBe(false);
    expect(carriersEditable("INVITED", SEQUESTRE)).toBe(false);
  });

  it("dit ce qui manque avant d’émettre", () => {
    expect(transferBlockers({ carriers: [], effectiveDate: null })).toHaveLength(2);
    expect(transferBlockers({ carriers: [{ name: "AXA", code: "" }], effectiveDate: new Date() })).toEqual([]);
  });
});

describe("listes par service", () => {
  it("retrouve le service depuis l’adresse", () => {
    expect(serviceBySlug("transactions-securisees")?.key).toBe("escrow");
    expect(serviceBySlug("inconnu")).toBeNull();
  });

  it("borne le tri et la pagination", () => {
    expect(listParams({})).toEqual({ tri: "createdAt", ordre: "desc", parPage: 12, page: 1 });
    expect(listParams({ tri: "updatedAt", ordre: "asc", parPage: "48", page: "3" })).toEqual({
      tri: "updatedAt",
      ordre: "asc",
      parPage: 48,
      page: 3,
    });
    expect(listParams({ tri: "x", parPage: "7", page: "-2" })).toEqual({
      tri: "createdAt",
      ordre: "desc",
      parPage: 12,
      page: 1,
    });
  });

  it("n’exige un prix que du kit et du séquestre", () => {
    expect(priceRequired(ATTESTATIONS)).toBe(false);
    expect(priceRequired(KIT)).toBe(true);
    expect(priceRequired(SEQUESTRE)).toBe(true);
  });
});
