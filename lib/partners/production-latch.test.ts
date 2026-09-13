import { afterEach, describe, expect, it } from "vitest";
import { productionUnlocked } from "@/lib/partners/status";

const CLES = ["TRUSTAP_ENV", "TRUSTAP_ALLOW_LIVE"];

afterEach(() => {
  for (const cle of CLES) delete process.env[cle];
});

describe("verrou de production des partenaires", () => {
  it("laisse passer le bac à sable par défaut", () => {
    // Aucun environnement déclaré : c'est l'état sûr, rien de réel ne part.
    expect(productionUnlocked("TRUSTAP")).toBe(true);
  });

  it("laisse passer un bac à sable déclaré", () => {
    process.env.TRUSTAP_ENV = "sandbox";
    expect(productionUnlocked("TRUSTAP")).toBe(true);
  });

  it("refuse la production sans autorisation explicite", () => {
    // Le cas qui compte : une clé de production collée par erreur.
    process.env.TRUSTAP_ENV = "production";
    expect(productionUnlocked("TRUSTAP")).toBe(false);
  });

  it("refuse une autorisation mal écrite", () => {
    process.env.TRUSTAP_ENV = "production";
    for (const valeur of ["1", "TRUE", "yes", ""]) {
      process.env.TRUSTAP_ALLOW_LIVE = valeur;
      expect(productionUnlocked("TRUSTAP")).toBe(false);
    }
  });

  it("ouvre la production sur autorisation explicite", () => {
    process.env.TRUSTAP_ENV = "production";
    process.env.TRUSTAP_ALLOW_LIVE = "true";
    expect(productionUnlocked("TRUSTAP")).toBe(true);
  });

  it("tolère la casse et les espaces sur l’environnement", () => {
    process.env.TRUSTAP_ENV = "  Production ";
    expect(productionUnlocked("TRUSTAP")).toBe(false);
  });
});
