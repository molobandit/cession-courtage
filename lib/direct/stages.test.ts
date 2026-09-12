import { describe, expect, it } from "vitest";
import {
  canAdvance,
  nextStage,
  progressPercent,
  stagesFor,
  stepByKey,
} from "@/lib/direct/stages";

const TOUT = { kit: true, escrow: true, attestations: true };
const KIT_SEUL = { kit: true, escrow: false, attestations: false };
const SEQUESTRE_SEUL = { kit: false, escrow: true, attestations: false };
const ATTESTATIONS_SEULES = { kit: false, escrow: false, attestations: true };

describe("le parcours s’adapte aux services achetés", () => {
  it("déroule tout quand tout est pris", () => {
    expect(stagesFor(TOUT)).toEqual([
      "INVITED",
      "ACCEPTED",
      "KYC",
      "DEED",
      "SIGNATURE",
      "ESCROW",
      "TRANSFER",
      "CLOSED",
    ]);
  });

  it("n’impose pas de séquestre à qui n’en a pas pris", () => {
    // Une etape qu'on ne peut pas franchir est une etape qui bloque.
    expect(stagesFor(KIT_SEUL)).not.toContain("ESCROW");
  });

  it("comprend les attestations dans le kit", () => {
    expect(stagesFor(KIT_SEUL)).toContain("TRANSFER");
  });

  it("réduit au minimum quand seul le séquestre est pris", () => {
    expect(stagesFor(SEQUESTRE_SEUL)).toEqual(["INVITED", "ACCEPTED", "ESCROW", "CLOSED"]);
  });

  it("garde toujours l’invitation, l’accord et la clôture", () => {
    for (const services of [TOUT, KIT_SEUL, SEQUESTRE_SEUL, ATTESTATIONS_SEULES]) {
      const etapes = stagesFor(services);
      expect(etapes[0]).toBe("INVITED");
      expect(etapes[1]).toBe("ACCEPTED");
      expect(etapes[etapes.length - 1]).toBe("CLOSED");
    }
  });
});

describe("on avance d’un cran, jamais en arrière", () => {
  it("donne l’étape suivante", () => {
    expect(nextStage("INVITED", TOUT)).toBe("ACCEPTED");
    expect(nextStage("SIGNATURE", TOUT)).toBe("ESCROW");
  });

  it("saute l’étape non applicable", () => {
    expect(nextStage("SIGNATURE", KIT_SEUL)).toBe("TRANSFER");
  });

  it("n’a plus de suite une fois clos", () => {
    expect(nextStage("CLOSED", TOUT)).toBeNull();
  });

  it("refuse un saut d’étape", () => {
    // Signer avant d'avoir verifie les parties laisserait un acte sans KYC.
    expect(canAdvance("ACCEPTED", "SIGNATURE", TOUT)).toBe(false);
    expect(canAdvance("ACCEPTED", "KYC", TOUT)).toBe(true);
  });

  it("refuse un retour en arrière", () => {
    expect(canAdvance("SIGNATURE", "DEED", TOUT)).toBe(false);
  });

  it("refuse une étape que les services ne prévoient pas", () => {
    expect(canAdvance("SIGNATURE", "ESCROW", KIT_SEUL)).toBe(false);
  });
});

describe("avancement affiché", () => {
  it("part de zéro et finit à cent", () => {
    expect(progressPercent("INVITED", TOUT)).toBe(0);
    expect(progressPercent("CLOSED", TOUT)).toBe(100);
  });

  it("atteint cent même sur un parcours réduit", () => {
    // Le pourcentage se calcule sur les etapes applicables : sinon un dossier
    // sans sequestre plafonnerait sous 100 % en etant pourtant termine.
    expect(progressPercent("CLOSED", SEQUESTRE_SEUL)).toBe(100);
    expect(progressPercent("CLOSED", ATTESTATIONS_SEULES)).toBe(100);
  });

  it("progresse au milieu du parcours", () => {
    const p = progressPercent("DEED", TOUT);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(100);
  });

  it("rend zéro sur une étape hors parcours", () => {
    expect(progressPercent("ESCROW", KIT_SEUL)).toBe(0);
  });
});

describe("libellés", () => {
  it("nomme chaque étape", () => {
    expect(stepByKey("ESCROW").label).toBe("Fonds séquestrés");
    expect(stepByKey("CLOSED").label).toBe("Clôturé");
  });
});
