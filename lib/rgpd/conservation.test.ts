import { describe, expect, it } from "vitest";
import { aExpire, REGLES, regle, seuil } from "@/lib/rgpd/conservation";

const MAINTENANT = new Date("2026-09-10T12:00:00Z");
const JOUR = 24 * 60 * 60 * 1000;

describe("durees de conservation", () => {
  it("motive chaque duree", () => {
    // Une duree sans justification ne tient pas devant l'autorite : le motif
    // fait partie de la regle, pas du commentaire.
    for (const r of REGLES) {
      expect(r.jours).toBeGreaterThan(0);
      expect(r.motif.length).toBeGreaterThan(40);
      expect(r.donnee.length).toBeGreaterThan(3);
    }
  });

  it("ne comporte aucun doublon de libelle", () => {
    const libelles = REGLES.map((r) => r.donnee);
    expect(new Set(libelles).size).toBe(libelles.length);
  });

  it("calcule le seuil a la journee pres", () => {
    expect(seuil(1, MAINTENANT).toISOString()).toBe("2026-09-09T12:00:00.000Z");
    expect(seuil(365, MAINTENANT).getTime()).toBe(MAINTENANT.getTime() - 365 * JOUR);
  });

  it("declare expiree une donnee au-dela de sa duree, pas avant", () => {
    const hier = new Date(MAINTENANT.getTime() - JOUR);
    expect(aExpire(hier, 1, MAINTENANT)).toBe(true);
    expect(aExpire(new Date(hier.getTime() + 1), 1, MAINTENANT)).toBe(false);
  });

  it("garde les pieces contractuelles plus longtemps que les journaux", () => {
    // Effacer une offre avant la prescription priverait une partie de sa preuve.
    expect(regle("Dossiers, offres et dépôts").jours).toBeGreaterThan(
      regle("Journal d’audit").jours,
    );
    expect(regle("Dossiers, offres et dépôts").jours).toBe(3650);
  });

  it("purge les donnees transitoires sous deux jours", () => {
    expect(regle("Jeton de connexion par lien magique").jours).toBeLessThanOrEqual(2);
    expect(regle("Compteur d’échecs de connexion").jours).toBeLessThanOrEqual(2);
  });

  it("signale une regle demandee qui n'existe pas", () => {
    expect(() => regle("Donnee inventee")).toThrow(/Regle de conservation absente/);
  });
});
