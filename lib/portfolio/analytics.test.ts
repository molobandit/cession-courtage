import { describe, expect, it } from "vitest";
import {
  breakdownBy,
  dominantSegment,
  herfindahl,
  marketPosition,
  maturitySchedule,
  topClientShare,
  type AnalyticsLine,
} from "@/lib/portfolio/analytics";

function line(partial: Partial<AnalyticsLine>): AnalyticsLine {
  return {
    carrier: "AXA",
    riskType: "AUTO",
    clientSegment: "INDIVIDUAL",
    department: "75",
    clientKey: "c1",
    annualCommission: 100,
    renewalDate: new Date("2026-10-15T00:00:00Z"),
    effectiveDate: new Date("2020-01-01T00:00:00Z"),
    ...partial,
  };
}

describe("breakdownBy", () => {
  it("trie du plus lourd au plus leger et calcule les parts", () => {
    const shares = breakdownBy(
      [
        line({ carrier: "AXA", annualCommission: 300 }),
        line({ carrier: "Allianz", annualCommission: 100 }),
        line({ carrier: "AXA", annualCommission: 100 }),
      ],
      (l) => l.carrier,
    );
    expect(shares[0]!.label).toBe("AXA");
    expect(shares[0]!.value).toBe(400);
    expect(shares[0]!.share).toBeCloseTo(0.8, 5);
    expect(shares[0]!.contracts).toBe(2);
  });

  it("replie la queue au dela de la limite", () => {
    const lines = Array.from({ length: 10 }, (_, i) =>
      line({ carrier: `C${i}`, annualCommission: 10 - i }),
    );
    const shares = breakdownBy(lines, (l) => l.carrier, 3);
    expect(shares).toHaveLength(4);
    expect(shares[3]!.label).toBe("Autres (7)");
    expect(shares[3]!.contracts).toBe(7);
  });

  it("remplace une cle vide par un libelle lisible", () => {
    const shares = breakdownBy([line({ carrier: "" })], (l) => l.carrier);
    expect(shares[0]!.label).toBe("Non renseigné");
  });

  it("renvoie une liste vide sans commissions", () => {
    expect(breakdownBy([line({ annualCommission: 0 })], (l) => l.carrier)).toEqual([]);
  });
});

describe("herfindahl", () => {
  it("vaut 0,50 sur un partage 50/50, comme la cascade", () => {
    const shares = breakdownBy(
      [
        line({ carrier: "AXA", annualCommission: 100 }),
        line({ carrier: "Allianz", annualCommission: 100 }),
      ],
      (l) => l.carrier,
    );
    expect(herfindahl(shares)).toBeCloseTo(0.5, 4);
  });

  it("vaut 1 sur une compagnie unique", () => {
    const shares = breakdownBy([line({ annualCommission: 100 })], (l) => l.carrier);
    expect(herfindahl(shares)).toBeCloseTo(1, 4);
  });
});

describe("topClientShare", () => {
  it("mesure le poids des dix premiers clients", () => {
    const lines = [
      ...Array.from({ length: 10 }, (_, i) => line({ clientKey: `gros${i}`, annualCommission: 100 })),
      ...Array.from({ length: 50 }, (_, i) => line({ clientKey: `petit${i}`, annualCommission: 10 })),
    ];
    // 1 000 sur 1 500.
    expect(topClientShare(lines)).toBeCloseTo(0.6667, 3);
  });
});

describe("maturitySchedule", () => {
  it("produit douze mois consecutifs a partir du mois donne", () => {
    const buckets = maturitySchedule([], new Date("2026-09-08T00:00:00Z"));
    expect(buckets).toHaveLength(12);
    expect(buckets[0]!.month).toBe("2026-09");
    expect(buckets[11]!.month).toBe("2027-08");
    expect(buckets[0]!.label).toBe("sept. 26");
  });

  it("range chaque contrat dans son mois d'echeance", () => {
    const buckets = maturitySchedule(
      [
        line({ renewalDate: new Date("2026-10-15T00:00:00Z"), annualCommission: 40 }),
        line({ renewalDate: new Date("2026-10-02T00:00:00Z"), annualCommission: 60 }),
      ],
      new Date("2026-09-01T00:00:00Z"),
    );
    const octobre = buckets.find((b) => b.month === "2026-10")!;
    expect(octobre.contracts).toBe(2);
    expect(octobre.commissions).toBe(100);
  });

  it("ignore une echeance hors de la fenetre de douze mois", () => {
    const buckets = maturitySchedule(
      [line({ renewalDate: new Date("2030-01-01T00:00:00Z") })],
      new Date("2026-09-01T00:00:00Z"),
    );
    expect(buckets.every((b) => b.contracts === 0)).toBe(true);
  });
});

describe("marketPosition", () => {
  it("situe un multiple dans la fourchette du particulier (1,5 a 2,5)", () => {
    const p = marketPosition(90000, 45000, "INDIVIDUAL")!;
    expect(p.effective).toBe(2);
    expect(p.verdict).toBe("dans");
    expect(p.position).toBeCloseTo(0.5, 5);
  });

  it("signale un multiple sous la fourchette", () => {
    expect(marketPosition(45000, 45000, "INDIVIDUAL")!.verdict).toBe("sous");
  });

  it("signale un multiple au-dessus de la fourchette", () => {
    expect(marketPosition(200000, 45000, "INDIVIDUAL")!.verdict).toBe("au-dessus");
  });

  it("applique la fourchette professionnelle (2,5 a 4)", () => {
    const p = marketPosition(135000, 45000, "PROFESSIONAL")!;
    expect(p.effective).toBe(3);
    expect(p.low).toBe(2.5);
    expect(p.high).toBe(4);
  });

  it("ne calcule rien sans commissions", () => {
    expect(marketPosition(90000, 0, "INDIVIDUAL")).toBeNull();
  });
});

describe("dominantSegment", () => {
  it("retient la clientele majoritaire en commissions", () => {
    const lines = [
      line({ clientSegment: "INDIVIDUAL", annualCommission: 100 }),
      line({ clientSegment: "PROFESSIONAL", annualCommission: 400 }),
    ];
    expect(dominantSegment(lines)).toBe("PROFESSIONAL");
  });
});
