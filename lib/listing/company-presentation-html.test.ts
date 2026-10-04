import { describe, expect, it } from "vitest";
import type { CompanyPresentation } from "@/lib/listing/company-presentation";
import { buildCompanyPresentationHtml, companyPresentationFileName } from "@/lib/listing/company-presentation-html";

function fiche(over: Partial<CompanyPresentation> = {}): CompanyPresentation {
  return {
    publicNumber: 10005,
    issuedAt: new Date("2026-09-14T10:00:00Z"),
    firm: { legalName: "Cabinet Œuvre — Courtage", legalForm: "SAS", siren: "890120005", address: "8 rue Faidherbe", postalCode: "59000", city: "Lille", region: "Hauts-de-France", foundedYear: 2012, headcount: 4, annualRevenue: 310000, distribution: "Agence", website: null, activityType: null },
    contact: { fullName: "Claire Dubois", jobTitle: "Gérante", email: "claire@example.fr", phone: "+33 6 45 12 00 05", oriasNumber: "17001005" },
    portfolio: { label: "Portefeuille Nord", annualCommissions: 11087, contractCount: 341, clientCount: 173, averageAgeMonths: 40, churnRate: 0.118, history: [{ label: "Exercice 2025", value: 11087 }] },
    sale: { askingPrice: 19373, multiple: 1.75, negotiable: true, motive: "Départ à la retraite", desiredDate: "2027-01", presentation: "Clientèle fidèle.", zone: "Nord", certified: true, partial: false },
    breakdowns: [{ title: "Par branche", shares: [{ label: "Santé", value: 3084, share: 0.278, contracts: 80 }] }],
    regulatory: [{ label: "Formation DDA", value: "Formations DDA à jour" }],
    profile: [{ section: "Positionnement", rows: [{ label: "Branches travaillées", value: "Santé et prévoyance" }] }],
    documents: [{ label: "Statuts de la société", date: new Date("2026-09-01T10:00:00Z") }],
    ...over,
  };
}

const images = { mark: "data:image/png;base64,AA==" };
const visible = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");

describe("présentation du cabinet", () => {
  it("compose couverture, identité, portefeuille, répartition et conformité", () => {
    const html = buildCompanyPresentationHtml(fiche(), { images });
    expect(html.match(/<section class="page/g)).toHaveLength(5);
    expect(html).toContain("Claire Dubois");
    expect(html).toContain("janvier 2027");
  });

  it("n'affiche aucun tiret de ponctuation ni barre", () => {
    expect(visible(buildCompanyPresentationHtml(fiche(), { images }))).not.toMatch(/[—–|]|\s-\s/);
  });

  it("ajoute des pages quand la conformité est longue", () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ label: `Point ${i}`, value: "Oui" }));
    const html = buildCompanyPresentationHtml(fiche({ regulatory: rows }), { images });
    expect(html.match(/<section class="page/g)!.length).toBeGreaterThan(5);
  });

  it("inscrit le destinataire et nomme le fichier", () => {
    const html = buildCompanyPresentationHtml(fiche(), { images, recipient: { label: "l'acquéreur A·12", date: new Date("2026-10-04") } });
    expect(html).toContain("Remis à l'acquéreur A·12 le 04/10/2026");
    expect(companyPresentationFileName(10005)).toBe("Presentation_cabinet_10005_La_bourse_du_portefeuille.pdf");
  });
});
