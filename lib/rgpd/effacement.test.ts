import { describe, expect, it } from "vitest";
import {
  dossiersBloquants,
  effacementPossible,
  identiteNeutralisee,
  motifDeRefus,
} from "@/lib/rgpd/effacement";

describe("effacement d'un compte, article 17", () => {
  it("autorise l'effacement sans aucun dossier", () => {
    expect(effacementPossible([])).toBe(true);
    expect(dossiersBloquants([])).toBe(0);
  });

  it("autorise l'effacement quand tous les dossiers sont clos", () => {
    expect(effacementPossible([{ stage: "CLOSED" }, { stage: "CLOSED" }])).toBe(true);
  });

  it("suspend l'effacement tant qu'un dossier est ouvert", () => {
    // L'article 17.3 reserve les donnees necessaires a l'execution du contrat :
    // effacer un cedant en plein sequestre priverait l'acquereur de sa preuve.
    for (const stage of ["NDA", "DATA_ROOM", "LOI", "ESCROW", "RETENTION"]) {
      expect(effacementPossible([{ stage }])).toBe(false);
    }
  });

  it("compte precisement les dossiers bloquants", () => {
    const dossiers = [{ stage: "CLOSED" }, { stage: "LOI" }, { stage: "ESCROW" }];
    expect(dossiersBloquants(dossiers)).toBe(2);
  });

  it("motive le refus, au singulier comme au pluriel", () => {
    expect(motifDeRefus(1)).toMatch(/1 dossier en cours/);
    expect(motifDeRefus(1)).not.toMatch(/dossiers en cours/);
    expect(motifDeRefus(3)).toMatch(/3 dossiers en cours/);
    // Le refus doit citer son fondement, sinon il ressemble a un caprice.
    expect(motifDeRefus(1)).toMatch(/17\.3/);
  });

  it("neutralise l'identite sans laisser de donnee nominative", () => {
    const neutre = identiteNeutralisee("user_abc");
    expect(neutre.fullName).toBeNull();
    expect(neutre.phone).toBeNull();
    expect(neutre.passwordHash).toBeNull();
    // Aucune connexion ne doit plus etre possible.
    expect(neutre.passwordHash).toBeNull();
  });

  it("garde des valeurs uniques pour les colonnes qui l'exigent", () => {
    // email et oriasNumber sont uniques et non nuls en base : on ne peut pas les
    // vider, seulement les rendre non signifiants, et deux comptes effaces ne
    // doivent pas entrer en collision.
    const a = identiteNeutralisee("user_a");
    const b = identiteNeutralisee("user_b");
    expect(a.email).not.toBe(b.email);
    expect(a.oriasNumber).not.toBe(b.oriasNumber);
    expect(a.email).toMatch(/\.invalid$/);
  });
});
