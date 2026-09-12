import { describe, expect, it } from "vitest";
import {
  ATTESTATIONS_FLAT_EUR,
  escrowFee,
  feeLines,
  feesTotal,
  hasAnyService,
  kitCapReachedAt,
  kitFee,
  KIT_CAP_EUR,
} from "@/lib/direct/fees";

const TOUT = { kit: true, escrow: true, attestations: true };
const RIEN = { kit: false, escrow: false, attestations: false };

describe("kit contractuel", () => {
  it("prend 6 % du prix", () => {
    expect(kitFee(30_000)).toBe(1_800);
  });

  it("plafonne, quel que soit le prix", () => {
    // Rediger un acte ne coute pas dix fois plus cher parce que le
    // portefeuille vaut dix fois plus.
    expect(kitFee(500_000)).toBe(KIT_CAP_EUR);
    expect(kitFee(5_000_000)).toBe(KIT_CAP_EUR);
  });

  it("dit à partir de quel prix le plafond mord", () => {
    expect(kitCapReachedAt()).toBe(66_500);
    expect(kitFee(kitCapReachedAt())).toBe(KIT_CAP_EUR);
  });

  it("rend zéro sur un prix absent ou absurde", () => {
    expect(kitFee(0)).toBe(0);
    expect(kitFee(-1)).toBe(0);
    expect(kitFee(Number.NaN)).toBe(0);
  });
});

describe("séquestre", () => {
  it("prend 2 % des fonds bloqués", () => {
    expect(escrowFee(80_000)).toBe(1_600);
  });

  it("ne facture rien sans fonds", () => {
    expect(escrowFee(0)).toBe(0);
  });
});

describe("détail des honoraires", () => {
  it("ne facture que ce qui est demandé", () => {
    const lignes = feeLines({
      services: { kit: true, escrow: false, attestations: false },
      salePrice: 30_000,
      escrowedAmount: 80_000,
    });
    expect(lignes.map((l) => l.key)).toEqual(["kit"]);
    expect(feesTotal(lignes)).toBe(1_800);
  });

  it("ne fait pas payer deux fois les attestations", () => {
    // Elles sont comprises dans le kit : les ajouter serait facturer deux
    // fois la meme prestation.
    const lignes = feeLines({ services: TOUT, salePrice: 30_000, escrowedAmount: 80_000 });
    expect(lignes.map((l) => l.key)).toEqual(["kit", "escrow"]);
    expect(feesTotal(lignes)).toBe(3_400);
  });

  it("les facture seules quand le kit n’est pas pris", () => {
    const lignes = feeLines({
      services: { kit: false, escrow: false, attestations: true },
      salePrice: 30_000,
      escrowedAmount: 0,
    });
    expect(feesTotal(lignes)).toBe(ATTESTATIONS_FLAT_EUR);
  });

  it("rend une note vide quand rien n’est pris", () => {
    const lignes = feeLines({ services: RIEN, salePrice: 30_000, escrowedAmount: 80_000 });
    expect(lignes).toHaveLength(0);
    expect(feesTotal(lignes)).toBe(0);
  });

  it("laisse retirer un service et voir l’économie", () => {
    const avec = feesTotal(
      feeLines({ services: TOUT, salePrice: 100_000, escrowedAmount: 80_000 }),
    );
    const sans = feesTotal(
      feeLines({
        services: { kit: true, escrow: false, attestations: false },
        salePrice: 100_000,
        escrowedAmount: 80_000,
      }),
    );
    expect(avec - sans).toBe(1_600);
  });
});

describe("ouverture d’un dossier", () => {
  it("exige au moins un service", () => {
    expect(hasAnyService(RIEN)).toBe(false);
    expect(hasAnyService({ ...RIEN, attestations: true })).toBe(true);
  });
});
