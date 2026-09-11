import { describe, expect, it } from "vitest";
import {
  conditions,
  etatApres,
  manquants,
  mouvementPermis,
  prochainMouvement,
  type EtatDossier,
} from "@/lib/escrow/conditions";

const pret: EtatDossier = {
  etape: "SIGNATURE",
  sequestre: "NONE",
  kycCedant: true,
  kycAcquereur: true,
  acteSigne: true,
  compagniesTotal: 3,
  compagniesRepondues: 0,
  releveDouzeMois: false,
};

describe("dépôt des fonds", () => {
  it("accepte un dossier signé et vérifié des deux côtés", () => {
    expect(mouvementPermis("DEPOT", pret)).toBe(true);
  });

  it("refuse tant que l’acte n’est pas signé", () => {
    expect(mouvementPermis("DEPOT", { ...pret, acteSigne: false })).toBe(false);
    expect(mouvementPermis("DEPOT", { ...pret, etape: "LOI" })).toBe(false);
  });

  it("refuse si l’identité d’une des parties n’est pas vérifiée", () => {
    // Detenir les fonds d'un inconnu expose le sequestre autant que la
    // plateforme.
    expect(mouvementPermis("DEPOT", { ...pret, kycCedant: false })).toBe(false);
    expect(mouvementPermis("DEPOT", { ...pret, kycAcquereur: false })).toBe(false);
  });

  it("dit précisément ce qui manque", () => {
    const cles = manquants("DEPOT", { ...pret, kycAcquereur: false }).map((c) => c.cle);
    expect(cles).toEqual(["kyc_acquereur"]);
  });
});

describe("libération du comptant", () => {
  const detenus: EtatDossier = { ...pret, sequestre: "FUNDS_HELD", etape: "TRANSFER" };

  it("refuse tant qu’une compagnie n’a pas répondu", () => {
    // Un refus de transfert de code coupe les commissions apres la signature :
    // liberer avant les reponses, c'est payer un portefeuille qui peut se vider.
    expect(mouvementPermis("LIBERATION_COMPTANT", { ...detenus, compagniesRepondues: 2 })).toBe(false);
    const cles = manquants("LIBERATION_COMPTANT", { ...detenus, compagniesRepondues: 2 }).map((c) => c.cle);
    expect(cles).toContain("compagnies_repondues");
  });

  it("accepte quand toutes ont répondu et que le transfert est engagé", () => {
    expect(mouvementPermis("LIBERATION_COMPTANT", { ...detenus, compagniesRepondues: 3 })).toBe(true);
  });

  it("accepte un dossier sans aucune compagnie à consulter", () => {
    const sansCompagnie = { ...detenus, compagniesTotal: 0, compagniesRepondues: 0 };
    expect(mouvementPermis("LIBERATION_COMPTANT", sansCompagnie)).toBe(true);
  });

  it("refuse tant que le transfert n’est pas engagé", () => {
    const avant = { ...detenus, etape: "SIGNATURE" as const, compagniesRepondues: 3 };
    expect(mouvementPermis("LIBERATION_COMPTANT", avant)).toBe(false);
  });

  it("refuse si les fonds ne sont pas détenus", () => {
    expect(mouvementPermis("LIBERATION_COMPTANT", { ...detenus, sequestre: "NONE" })).toBe(false);
  });
});

describe("libération du solde", () => {
  const comptantLibere: EtatDossier = {
    ...pret,
    sequestre: "PARTIAL_RELEASE",
    etape: "RETENTION",
    compagniesRepondues: 3,
  };

  it("refuse sans le relevé de rétention à douze mois", () => {
    // Le montant differe depend du taux constate : liberer avant le releve
    // priverait l'acquereur de l'ajustement qu'il a negocie.
    expect(mouvementPermis("LIBERATION_DIFFERE", comptantLibere)).toBe(false);
  });

  it("accepte une fois le relevé remis", () => {
    expect(mouvementPermis("LIBERATION_DIFFERE", { ...comptantLibere, releveDouzeMois: true })).toBe(true);
  });
});

describe("remboursement", () => {
  it("reste possible tant que rien n’est libéré", () => {
    expect(mouvementPermis("REMBOURSEMENT", { ...pret, sequestre: "FUNDS_HELD" })).toBe(true);
  });

  it("devient impossible une fois le comptant libéré", () => {
    // Au-dela, la cession a produit ses effets : un retour en arriere releve du
    // contentieux, pas d'un bouton.
    expect(mouvementPermis("REMBOURSEMENT", { ...pret, sequestre: "PARTIAL_RELEASE" })).toBe(false);
    expect(mouvementPermis("REMBOURSEMENT", { ...pret, sequestre: "RELEASED" })).toBe(false);
  });
});

describe("rejeu et enchaînement", () => {
  it("interdit de rejouer un mouvement déjà effectué", () => {
    // D1 n'a pas de transactions : ce controle est la seule barriere contre une
    // double liberation.
    const libere: EtatDossier = { ...pret, sequestre: "RELEASED", releveDouzeMois: true };
    for (const m of ["DEPOT", "LIBERATION_COMPTANT", "LIBERATION_DIFFERE", "REMBOURSEMENT"] as const) {
      expect(mouvementPermis(m, libere)).toBe(false);
    }
  });

  it("n’a plus rien à proposer une fois le séquestre soldé", () => {
    expect(prochainMouvement({ ...pret, sequestre: "RELEASED" })).toBeNull();
    expect(prochainMouvement({ ...pret, sequestre: "REFUNDED" })).toBeNull();
  });

  it("enchaîne dépôt, comptant, solde", () => {
    expect(prochainMouvement({ ...pret, sequestre: "NONE" })).toBe("DEPOT");
    expect(prochainMouvement({ ...pret, sequestre: "FUNDS_HELD" })).toBe("LIBERATION_COMPTANT");
    expect(prochainMouvement({ ...pret, sequestre: "PARTIAL_RELEASE" })).toBe("LIBERATION_DIFFERE");
  });

  it("mène chaque mouvement à l’état attendu", () => {
    expect(etatApres("DEPOT")).toBe("FUNDS_HELD");
    expect(etatApres("LIBERATION_COMPTANT")).toBe("PARTIAL_RELEASE");
    expect(etatApres("LIBERATION_DIFFERE")).toBe("RELEASED");
    expect(etatApres("REMBOURSEMENT")).toBe("REFUNDED");
  });
});

describe("lisibilité pour les parties", () => {
  it("nomme et justifie chaque condition", () => {
    // Un refus doit pouvoir etre montre aux deux parties : un sequestre qui
    // refuse sans dire pourquoi finit par etre contourne a la main.
    for (const m of ["DEPOT", "LIBERATION_COMPTANT", "LIBERATION_DIFFERE", "REMBOURSEMENT"] as const) {
      for (const c of conditions(m, pret)) {
        expect(c.cle).toMatch(/^[a-z_]+$/);
        expect(c.libelle.length).toBeGreaterThan(15);
      }
    }
  });
});
