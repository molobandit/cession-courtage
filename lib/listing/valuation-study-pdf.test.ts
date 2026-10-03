import { PDFDocument } from "pdf-lib";
import { ClientSegment, CommissionType, RiskType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { roundedRange, studyFromLines, studyHeadline, studyKeyPoints } from "@/lib/listing/valuation-study-model";
import { renderValuationStudyPdf } from "@/lib/listing/valuation-study-pdf";
import type { StudyInputLine } from "@/lib/listing/valuation-study-model";

const cutoff = new Date("2026-09-18T10:00:00Z");

function ligne(over: Partial<StudyInputLine> & { annualCommission: number; riskType: RiskType; carrier: string }): StudyInputLine {
  return {
    clientSegment: ClientSegment.INDIVIDUAL,
    department: "75",
    clientKey: over.clientKey ?? `c-${over.annualCommission}`,
    renewalDate: cutoff,
    effectiveDate: cutoff,
    commissionType: CommissionType.LINEAR,
    ...over,
  };
}

describe("étude de portefeuille (modèle)", () => {
  it("titre le dossier d’après les deux premières branches", () => {
    expect(
      studyHeadline([
        { label: "Santé", value: 7750, share: 0.99, contracts: 57 },
        { label: "Obsèques", value: 78, share: 0.01, contracts: 3 },
      ]),
    ).toBe("Portefeuille santé et obsèques");
  });

  it("signale la concentration sur un seul assureur et l’absence de précompte", () => {
    const points = studyKeyPoints({
      byBranch: [
        { label: "Santé", value: 7750, share: 0.99, contracts: 57 },
        { label: "Obsèques", value: 78, share: 0.01, contracts: 3 },
      ],
      topCarrier: { name: "C2G Assurances", share: 1 },
      contractCount: 60,
      carrierCount: 1,
      advancedCommissionShare: 0,
      listingPrecompte: false,
    });
    expect(points.some((p) => p.includes("C2G Assurances"))).toBe(true);
    expect(points.some((p) => p.includes("précompte"))).toBe(true);
    expect(points.some((p) => p.includes("60 contrats"))).toBe(true);
  });

  it("arrondit la fourchette à la centaine", () => {
    expect(roundedRange(13480, 15610)).toEqual({ low: 13500, high: 15600 });
  });
});

describe("étude de portefeuille (PDF)", () => {
  it("produit un dossier anonymisé, sans raison sociale", async () => {
    const lines: StudyInputLine[] = [
      ...Array.from({ length: 57 }, (_, i) =>
        ligne({
          annualCommission: 135.96,
          riskType: RiskType.HEALTH_INDIVIDUAL,
          carrier: "C2G Assurances",
          clientKey: `s-${i}`,
        }),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        ligne({
          annualCommission: 26.04,
          riskType: RiskType.FUNERAL,
          carrier: "C2G Assurances",
          clientKey: `o-${i}`,
        }),
      ),
    ];
    const study = studyFromLines({
      lines,
      publicNumber: 10298,
      issuedAt: cutoff,
      dataCutoff: cutoff,
      zone: "France (toutes régions)",
      listingPrecompte: false,
      lowValue: 13500,
      midValue: 14500,
      highValue: 15500,
    });
    expect(study.headline).toContain("santé");
    expect(study.carrierCount).toBe(1);
    expect(study.contractCount).toBe(60);

    const bytes = await renderValuationStudyPdf(study);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(6);
    expect(doc.getTitle()).toContain("10298");
    expect(doc.getTitle()?.toLowerCase()).toContain("valorisation");
    const raw = Buffer.from(bytes).toString("latin1");
    expect(raw).not.toMatch(/SIREN/);
    expect(raw).not.toMatch(/Cabinet Œuvre/);
  });
});
