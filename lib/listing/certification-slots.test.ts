import { describe, expect, it } from "vitest";
import { CERTIFICATION_SLOTS, summarizeCertificationSlots } from "@/lib/listing/certification-slots";

describe("summarizeCertificationSlots", () => {
  it("compte huit pièces et cinq obligatoires manquantes sans dépôt", () => {
    expect(CERTIFICATION_SLOTS).toHaveLength(8);
    expect(summarizeCertificationSlots([])).toEqual({
      slotCount: 8,
      received: 0,
      validated: 0,
      requiredMissing: 5,
    });
  });

  it("distingue reçu, validé et obligatoire manquant", () => {
    const progress = summarizeCertificationSlots([
      { category: "IDENTITY", label: "Justificatif ORIAS", status: "VALIDATED" },
      { category: "IDENTITY", label: "Extrait Kbis ou justificatif d’immatriculation", status: "RECEIVED" },
      { category: "PORTFOLIO", label: "Relevés des compagnies", status: "RECEIVED" },
    ]);
    expect(progress).toEqual({
      slotCount: 8,
      received: 3,
      validated: 1,
      requiredMissing: 3,
    });
  });
});
