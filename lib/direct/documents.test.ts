import { describe, expect, it } from "vitest";
import {
  MISSING,
  buildDocument,
  buildTransferCertificate,
  buildTransferDeed,
  documentsFor,
  missingPartyFields,
  type DocumentContext,
  type DocumentParty,
} from "@/lib/direct/documents";

const CEDANT: DocumentParty = {
  legalName: "Cabinet Lefort",
  legalForm: "SARL",
  siren: "512345678",
  address: "12 rue de Rivoli",
  postalCode: "75001",
  city: "Paris",
  oriasNumber: "07001234",
  representative: "Marie Lefort",
  jobTitle: "Gérante",
  email: "marie@example.test",
};

const CESSIONNAIRE: DocumentParty = {
  legalName: "Expansion IDF",
  legalForm: "SAS",
  siren: null,
  address: null,
  postalCode: null,
  city: null,
  oriasNumber: "09005678",
  representative: null,
  jobTitle: null,
  email: null,
};

function contexte(partiel: Partial<DocumentContext> = {}): DocumentContext {
  return {
    dealId: "clx0000000000abcdef12",
    portfolioLabel: "Santé individuelle, Paris",
    salePrice: 40_000,
    upfrontPercent: 60,
    escrow: true,
    seller: CEDANT,
    buyer: CESSIONNAIRE,
    carriers: [
      { name: "AXA", code: "AX-778" },
      { name: "Alptis", code: "" },
    ],
    effectiveDate: new Date("2026-10-01T10:00:00Z"),
    deedSignedAt: null,
    issuedAt: new Date("2026-09-13T10:00:00Z"),
    ...partiel,
  };
}

// Intl sépare les milliers par une espace fine insécable : on la ramène à une espace.
const texte = (doc: { sections: { paragraphs: string[] }[] }) =>
  doc.sections.flatMap((s) => s.paragraphs).join("\n").replace(/[\u202f\u00a0]/g, " ");

describe("protocole de cession", () => {
  it("reprend le prix, le comptant et le solde", () => {
    const corps = texte(buildTransferDeed(contexte()));
    expect(corps).toContain("40 000,00");
    expect(corps).toContain("24 000,00");
    expect(corps).toContain("16 000,00");
    expect(corps).toContain("1er octobre 2026");
  });

  it("ne parle de séquestre que s’il a été pris", () => {
    expect(texte(buildTransferDeed(contexte()))).toContain("compte séquestre");
    expect(texte(buildTransferDeed(contexte({ escrow: false })))).not.toContain("compte séquestre");
  });

  it("met les compagnies en annexe", () => {
    const annexe = buildTransferDeed(contexte()).annex!;
    expect(annexe.rows).toEqual([
      ["AXA", "AX-778"],
      ["Alptis", MISSING],
    ]);
  });
});

describe("attestation de transfert", () => {
  it("vise une compagnie et son code", () => {
    const doc = buildTransferCertificate(contexte(), 0)!;
    expect(doc.addressee?.[0]).toBe("AXA");
    expect(texte(doc)).toContain("AX-778");
    expect(texte(doc)).toContain("Expansion IDF");
    expect(doc.reference.endsWith("-1")).toBe(true);
  });

  it("signale le code manquant au lieu de le taire", () => {
    expect(texte(buildTransferCertificate(contexte(), 1)!)).toContain(MISSING);
  });

  it("n’invente pas de compagnie", () => {
    expect(buildTransferCertificate(contexte(), 5)).toBeNull();
    expect(buildDocument("attestation-9", contexte())).toBeNull();
    expect(buildDocument("inconnu", contexte())).toBeNull();
  });
});

describe("identification des parties", () => {
  it("liste ce qui manque avant impression", () => {
    expect(missingPartyFields(CEDANT)).toEqual([]);
    expect(missingPartyFields(CESSIONNAIRE)).toEqual(["SIREN", "adresse", "représentant légal"]);
  });
});

describe("disponibilité des pièces", () => {
  const carriers = contexte().carriers;

  it("n’ouvre le protocole qu’à l’étape de l’acte", () => {
    const avant = documentsFor({ stage: "KYC", services: { kit: true, escrow: false, attestations: false }, carriers });
    expect(avant.find((d) => d.key === "confidentialite")?.available).toBe(true);
    expect(avant.find((d) => d.key === "protocole")?.available).toBe(false);
  });

  it("émet une attestation par compagnie, à l’étape du transfert", () => {
    const services = { kit: false, escrow: false, attestations: true };
    const avant = documentsFor({ stage: "ACCEPTED", services, carriers });
    expect(avant.map((d) => d.key)).toEqual(["attestation-1", "attestation-2"]);
    expect(avant.every((d) => !d.available)).toBe(true);
    expect(documentsFor({ stage: "TRANSFER", services, carriers }).every((d) => d.available)).toBe(true);
  });

  it("réclame les compagnies quand il n’y en a aucune", () => {
    const pieces = documentsFor({ stage: "INVITED", services: { kit: false, escrow: false, attestations: true }, carriers: [] });
    expect(pieces).toHaveLength(1);
    expect(pieces[0].hint).toContain("compagnies");
  });

  it("ne produit aucune pièce pour un séquestre seul", () => {
    expect(documentsFor({ stage: "CLOSED", services: { kit: false, escrow: true, attestations: false }, carriers })).toEqual([]);
  });
});
