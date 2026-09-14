import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { CompanyPresentation } from "@/lib/listing/company-presentation";
import { renderCompanyPresentationPdf } from "@/lib/listing/company-presentation-pdf";

function fiche(over: Partial<CompanyPresentation> = {}): CompanyPresentation {
  return {
    publicNumber: 10005,
    issuedAt: new Date("2026-09-14T10:00:00Z"),
    firm: {
      legalName: "Cabinet Œuvre & Fils — Courtage",
      legalForm: "SAS",
      siren: "890120005",
      address: "8 rue Faidherbe",
      postalCode: "59000",
      city: "Lille",
      region: "Hauts-de-France",
      foundedYear: 2012,
      headcount: 4,
      annualRevenue: 310000,
      distribution: "Agence",
      website: "https://cabinet.example",
      activityType: null,
    },
    contact: { fullName: "Claire Dubois", jobTitle: "Gérante", email: "claire@example.fr", phone: "+33 6 45 12 00 05", oriasNumber: "17001005" },
    portfolio: { label: "Portefeuille Nord", annualCommissions: 11087, contractCount: 341, clientCount: 173, averageAgeMonths: 40, churnRate: 0.118, history: [{ label: "Exercice 2025", value: 11087 }] },
    sale: { askingPrice: 19373, multiple: 1.75, negotiable: true, motive: "Départ à la retraite", desiredDate: "2027-01", presentation: "Clientèle fidèle ≈ vingt ans d’ancienneté.\nÉquipe autonome.", zone: "Nord", certified: true, partial: false },
    breakdowns: [{ title: "Par branche", shares: [{ label: "Santé", value: 3084, share: 0.278, contracts: 80 }] }],
    regulatory: [{ label: "Formation DDA", value: "Formations DDA à jour" }],
    profile: [{ section: "Positionnement", rows: [{ label: "Branches travaillées", value: "Santé et prévoyance, Emprunteur" }] }],
    documents: [{ label: "Statuts de la société", date: new Date("2026-09-01T10:00:00Z") }],
    ...over,
  };
}

describe("présentation du cabinet en PDF", () => {
  it("produit un PDF lisible, titré au nom du cabinet", async () => {
    const bytes = await renderCompanyPresentationPdf(fiche());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(doc.getTitle()).toContain("10005");
  });

  it("ne casse pas sur un caractère que la police ne sait pas écrire, ni sur une longue présentation", async () => {
    const longue = Array.from({ length: 120 }, () => "Portefeuille ≈ fidèle, suivi par une équipe expérimentée.").join(" ");
    const bytes = await renderCompanyPresentationPdf(fiche({ sale: { ...fiche().sale, presentation: longue } }));
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
});
