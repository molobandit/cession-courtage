import { describe, expect, it } from "vitest";
import { buildPresentationDossierHtml, constatsEtude, presentationDossierFileName } from "@/lib/listing/presentation-dossier";
import type { ValuationStudy } from "@/lib/listing/valuation-study-model";

function study(over: Partial<ValuationStudy> = {}): ValuationStudy {
  const byBranch = [
    { label: "Santé", value: 6000, share: 0.6, contracts: 30 },
    { label: "Prévoyance", value: 4000, share: 0.4, contracts: 20 },
  ];
  const byCarrier = [
    { label: "Assureur Un", value: 7000, share: 0.7, contracts: 35 },
    { label: "Assureur Deux", value: 3000, share: 0.3, contracts: 15 },
  ];
  return {
    publicNumber: 10999,
    issuedAt: new Date("2026-09-22"),
    dataCutoff: new Date("2026-09-22"),
    zone: "Hérault",
    headline: "Portefeuille santé et prévoyance",
    contractCount: 50,
    annualCommissions: 10000,
    monthlyCommissions: 833.33,
    carrierCount: 2,
    topCarrier: { name: "Assureur Un", share: 0.7 },
    byBranch,
    byCarrier,
    averageCommissionPerContract: 200,
    averageAgeMonths: 48,
    advancedCommissionShare: 0,
    listingPrecompte: false,
    lowValue: 17000,
    midValue: 19000,
    highValue: 21000,
    lowMultiple: 1.7,
    highMultiple: 2.1,
    keyPoints: [],
    sourceNote: "",
    ...over,
  };
}

const images = { mark: "data:image/png;base64,AA==" };

function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/g, "")
    .replace(/<[^>]+>/g, " ");
}

describe("dossier de présentation", () => {
  it("compose les neuf pages", () => {
    const html = buildPresentationDossierHtml(study(), { certified: true, images });
    expect(html.match(/<section class="page/g)).toHaveLength(9);
  });

  it("n'affiche aucun tiret de ponctuation", () => {
    const html = buildPresentationDossierHtml(study({ zone: "Nord — Pas de Calais" }), { certified: true, images });
    expect(visibleText(html)).not.toMatch(/[—–|]|\s-\s/);
  });

  it("anonymise les compagnies", () => {
    const html = buildPresentationDossierHtml(study(), { certified: true, images });
    expect(html).not.toContain("Assureur Un");
    expect(html).toContain("Compagnie A");
  });

  it("donne quatre constats tirés des chiffres", () => {
    const constats = constatsEtude(study());
    expect(constats).toHaveLength(4);
    expect(constats.map((c) => c.titre)).toContain("Une compagnie principale");
    expect(constatsEtude(study({ carrierCount: 1 })).map((c) => c.titre)).toContain("Une compagnie unique");
  });

  it("remplace l'anneau par un grand chiffre pour une seule branche", () => {
    const one = study({ byBranch: [{ label: "Santé", value: 10000, share: 1, contracts: 50 }] });
    const html = buildPresentationDossierHtml(one, { certified: false, images });
    expect(html).toContain("100 %");
    expect(html).toContain("Portefeuille non certifié");
  });

  it("inscrit le destinataire et relie le dossier à l'annonce", () => {
    const html = buildPresentationDossierHtml(study(), {
      certified: true,
      images,
      recipient: { label: "l'acquéreur A·12", date: new Date("2026-10-04") },
      listingUrl: "https://exemple.test/annonces/10999",
    });
    expect(html).toContain("Remis à l'acquéreur A·12 le 04/10/2026");
    expect(html).toContain('href="https://exemple.test/annonces/10999#messages"');
    expect(html).toContain(">Se positionner</a>");
  });

  it("nomme le fichier proprement", () => {
    expect(presentationDossierFileName(10412)).toBe("Dossier_10412_La_bourse_du_portefeuille.pdf");
  });
});
