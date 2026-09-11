import { describe, expect, it } from "vitest";
import { regulatoryFacts } from "@/lib/listing/brief-labels";

describe("regulatoryFacts", () => {
  it("n’affiche que les champs renseignés, avec libellés français", () => {
    const rows = regulatoryFacts({
      transferVehicle: "parts",
      oriasCategories: "COA, MIA",
      distribution: null,
      distanceShare: null,
      employeeCount: "4",
      softwareStack: null,
      introducersCount: null,
      rcProInsurer: null,
      pendingLitigation: null,
      socialCommitments: null,
      complianceDema: "conforme",
      ddaTraining: "a_jour",
      amlProcedure: null,
      sellerDependency: null,
      premisesStatus: null,
      exclusiveMandates: null,
      stornoShare: null,
    });
    expect(rows).toEqual([
      { label: "Objet de la cession", value: "Cession de parts sociales" },
      { label: "Catégories ORIAS", value: "COA, MIA" },
      { label: "Démarchage", value: "Activité conforme Bloctel" },
      { label: "Effectif", value: "4" },
      { label: "Formation DDA", value: "Formations DDA à jour" },
    ]);
  });
});
