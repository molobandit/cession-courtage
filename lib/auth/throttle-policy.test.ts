import { describe, expect, it } from "vitest";
import {
  attenteApresEchecs,
  fenetreExpiree,
  messageVerrou,
  secondesRestantes,
  FENETRE_MS,
} from "@/lib/auth/throttle-policy";

describe("verrouillage apres echecs de connexion", () => {
  it("laisse passer les quatre premieres erreurs", () => {
    for (const echecs of [0, 1, 2, 3, 4]) {
      expect(attenteApresEchecs(echecs)).toBe(0);
    }
  });

  it("verrouille une minute des le cinquieme echec", () => {
    expect(attenteApresEchecs(5)).toBe(60_000);
    expect(attenteApresEchecs(9)).toBe(60_000);
  });

  it("durcit a quinze minutes au dixieme, une heure au vingtieme", () => {
    expect(attenteApresEchecs(10)).toBe(15 * 60_000);
    expect(attenteApresEchecs(20)).toBe(60 * 60_000);
    expect(attenteApresEchecs(500)).toBe(60 * 60_000);
  });

  it("ne verrouille jamais definitivement", () => {
    // Un blocage permanent permettrait de fermer le compte d'un tiers en
    // connaissant seulement son e-mail.
    expect(attenteApresEchecs(10_000)).toBeLessThanOrEqual(60 * 60_000);
  });

  it("remet le compteur a zero apres une heure sans tentative", () => {
    const t0 = new Date("2026-09-10T10:00:00Z");
    expect(fenetreExpiree(t0, new Date(t0.getTime() + FENETRE_MS - 1))).toBe(false);
    expect(fenetreExpiree(t0, new Date(t0.getTime() + FENETRE_MS))).toBe(true);
  });

  it("compte les secondes restantes, et zero une fois le verrou passe", () => {
    const maintenant = new Date("2026-09-10T10:00:00Z");
    expect(secondesRestantes(new Date("2026-09-10T10:00:30Z"), maintenant)).toBe(30);
    expect(secondesRestantes(new Date("2026-09-10T09:59:00Z"), maintenant)).toBe(0);
    expect(secondesRestantes(null, maintenant)).toBe(0);
  });

  it("ne revele jamais si le compte existe", () => {
    for (const secondes of [30, 60, 900, 3600]) {
      const message = messageVerrou(secondes);
      expect(message).not.toMatch(/compte|e-mail|existe|inconnu/i);
      expect(message).toMatch(/tentatives/i);
    }
  });
});
