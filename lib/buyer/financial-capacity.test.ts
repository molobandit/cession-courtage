import { describe, expect, it } from "vitest";
import {
  CAPACITE_MINIMUM_EUR,
  capaciteVerifiee,
  controlePerime,
  couvreLePrix,
  declarationRecevable,
  libelleCapacite,
  montantVisibleParLeCedant,
  type Capacite,
} from "@/lib/buyer/financial-capacity";

const MAINTENANT = new Date("2026-09-11T12:00:00Z");
const RECENT = new Date("2026-06-01T12:00:00Z");
const VIEUX = new Date("2025-06-01T12:00:00Z");

const verifiee: Capacite = { montantEur: 200_000, statut: "VERIFIED", verifieeLe: RECENT };

describe("capacité vérifiée", () => {
  it("ne l’est qu’après un contrôle daté", () => {
    expect(capaciteVerifiee(verifiee, MAINTENANT)).toBe(true);
    // Un statut VERIFIED sans date est une incohérence : on refuse plutôt que
    // d'afficher une vérification qu'on ne peut pas dater.
    expect(capaciteVerifiee({ ...verifiee, verifieeLe: null }, MAINTENANT)).toBe(false);
  });

  it("ne l’est jamais sur une simple déclaration", () => {
    for (const statut of ["NONE", "DECLARED", "REJECTED"] as const) {
      expect(capaciteVerifiee({ ...verifiee, statut }, MAINTENANT)).toBe(false);
    }
  });

  it("cesse de l’être au bout d’un an", () => {
    // La situation d'un cabinet change : afficher un contrôle périmé serait
    // trompeur pour le cédant qui s'y fie.
    expect(controlePerime(RECENT, MAINTENANT)).toBe(false);
    expect(controlePerime(VIEUX, MAINTENANT)).toBe(true);
    expect(capaciteVerifiee({ ...verifiee, verifieeLe: VIEUX }, MAINTENANT)).toBe(false);
  });

  it("expire au jour anniversaire, pas la veille", () => {
    const unAnMoinsUneSeconde = new Date("2026-06-01T11:59:59Z");
    const unAnPile = new Date("2026-06-01T12:00:00Z");
    expect(controlePerime(new Date("2025-06-01T12:00:00Z"), unAnMoinsUneSeconde)).toBe(false);
    expect(controlePerime(new Date("2025-06-01T12:00:00Z"), unAnPile)).toBe(true);
  });
});

describe("couverture du prix demandé", () => {
  it("couvre un prix inférieur ou égal", () => {
    expect(couvreLePrix(verifiee, 150_000, MAINTENANT)).toBe(true);
    expect(couvreLePrix(verifiee, 200_000, MAINTENANT)).toBe(true);
  });

  it("ne couvre pas au-delà", () => {
    expect(couvreLePrix(verifiee, 200_001, MAINTENANT)).toBe(false);
  });

  it("ne couvre rien sans vérification, quel que soit le montant déclaré", () => {
    const declaree: Capacite = { montantEur: 10_000_000, statut: "DECLARED", verifieeLe: null };
    expect(couvreLePrix(declaree, 1000, MAINTENANT)).toBe(false);
  });
});

describe("recevabilité d’une déclaration", () => {
  it("refuse en dessous du seuil du marché", () => {
    expect(declarationRecevable(CAPACITE_MINIMUM_EUR)).toBe(true);
    expect(declarationRecevable(CAPACITE_MINIMUM_EUR - 1)).toBe(false);
    expect(declarationRecevable(0)).toBe(false);
    expect(declarationRecevable(-1)).toBe(false);
  });

  it("refuse ce qui n’est pas un nombre fini", () => {
    expect(declarationRecevable(Number.NaN)).toBe(false);
    expect(declarationRecevable(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("ce que voit le cédant", () => {
  it("ne promet jamais la solvabilité, seulement le constat", () => {
    // « vérifiée » dit ce qui a été controle ; « solvable » promettrait l'avenir.
    const libelle = libelleCapacite(verifiee, MAINTENANT);
    expect(libelle).toBe("Capacité financière vérifiée");
    expect(libelle).not.toMatch(/solvab|garanti|s[ûu]r/i);
  });

  it("distingue chaque état sans ambiguïté", () => {
    expect(libelleCapacite({ ...verifiee, statut: "DECLARED" }, MAINTENANT)).toMatch(/contrôle en cours/);
    expect(libelleCapacite({ ...verifiee, statut: "REJECTED" }, MAINTENANT)).toMatch(/non retenue/);
    expect(libelleCapacite({ ...verifiee, statut: "NONE" }, MAINTENANT)).toMatch(/non déclarée/);
    expect(libelleCapacite({ ...verifiee, verifieeLe: VIEUX }, MAINTENANT)).toMatch(/renouveler/);
  });

  it("ne montre le montant qu’une fois le contrôle fait", () => {
    expect(montantVisibleParLeCedant(verifiee, MAINTENANT)).toBe(200_000);
    // Un montant seulement déclaré ne doit pas circuler : il induirait le
    // cédant en erreur alors que personne ne l'a contrôlé.
    expect(montantVisibleParLeCedant({ ...verifiee, statut: "DECLARED" }, MAINTENANT)).toBeNull();
    expect(montantVisibleParLeCedant({ ...verifiee, verifieeLe: VIEUX }, MAINTENANT)).toBeNull();
  });
});
