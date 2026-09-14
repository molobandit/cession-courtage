import { describe, expect, it } from "vitest";
import { defaultsFromBrief, defaultsFromFirmProfile } from "@/lib/listing/form-defaults";

describe("valeurs de départ du formulaire d’annonce", () => {
  it("reprend le profil du cabinet dans les champs de l’annonce", () => {
    const d = defaultsFromFirmProfile({
      conformite: { orias: ["COA", "MIA"], rcPro: "Hiscox", dda: "À jour", lcbft: "Formalisé", demarchage: "Conforme Bloctel" },
      organisation: { effectif: "2 à 5", distribution: "Mixte", dependance: "Forte", locaux: "Locataire" },
      strategie: { motif: "Retraite", accompagnement: "Plus de 6 mois" },
    });
    expect(d).toMatchObject({
      oriasCategories: "COA, MIA",
      rcProInsurer: "Hiscox",
      ddaTraining: "a_jour",
      amlProcedure: "formalise",
      complianceDema: "conforme",
      employeeCount: "2 à 5",
      distribution: "mixte",
      sellerDependency: "forte",
      premisesStatus: "Locataire",
      cessionMotive: "retraite",
      sellerSupportMonths: "6",
    });
  });

  it("laisse vides les champs que le profil ne renseigne pas", () => {
    const d = defaultsFromFirmProfile({});
    expect(Object.values(d).every((v) => v === undefined)).toBe(true);
  });

  it("restitue un brouillon tel qu’il a été saisi", () => {
    const d = defaultsFromBrief(
      {
        presentation: "Texte",
        cessionMotive: "recentrage",
        negotiable: false,
        certificationRequested: false,
        portfolioKind: "IARD",
        branchActivity: null,
        desiredCessionDate: "2027",
        precompte: true,
        precompteAmount: "1 200 €",
        regulatory: {
          transferVehicle: "fonds", oriasCategories: null, distribution: null, distanceShare: null, employeeCount: "3",
          softwareStack: null, introducersCount: null, rcProInsurer: null, pendingLitigation: null, socialCommitments: null,
          complianceDema: null, ddaTraining: "en_cours", amlProcedure: null, sellerDependency: null, premisesStatus: null,
          exclusiveMandates: null, stornoShare: null,
        },
      },
      4,
    );
    expect(d).toMatchObject({ negotiable: "no", precompte: "yes", sellerSupportMonths: "3", transferVehicle: "fonds", ddaTraining: "en_cours", presentation: "Texte" });
    expect(d.branchActivity).toBeUndefined();
  });
});
