import { describe, expect, it } from "vitest";
import {
  codePourCompteur,
  compteurPour,
  decoderBase32,
  encoderBase32,
  genererCodesDeSecours,
  genererSecret,
  uriOtpauth,
  verifierCode,
} from "@/lib/auth/totp";

/**
 * Vecteurs officiels de la RFC 6238, annexe B, pour SHA-1.
 * Le secret est "12345678901234567890" en ASCII, encode en base32.
 */
const SECRET_RFC = encoderBase32(new TextEncoder().encode("12345678901234567890"));

describe("TOTP, conformite RFC 6238", () => {
  it("reproduit les vecteurs de la RFC", async () => {
    // Chaque couple : instant en secondes, code attendu sur six chiffres.
    const vecteurs: [number, string][] = [
      [59, "287082"],
      [1111111109, "081804"],
      [1111111111, "050471"],
      [1234567890, "005924"],
      [2000000000, "279037"],
    ];
    for (const [secondes, attendu] of vecteurs) {
      const compteur = Math.floor(secondes / 30);
      expect(await codePourCompteur(SECRET_RFC, compteur)).toBe(attendu);
    }
  });

  it("code toujours six chiffres, zeros de tete compris", async () => {
    const code = await codePourCompteur(SECRET_RFC, Math.floor(1234567890 / 30));
    expect(code).toBe("005924");
    expect(code).toHaveLength(6);
  });
});

describe("base32", () => {
  it("fait un aller-retour sans perte", () => {
    const octets = new Uint8Array([0, 1, 127, 128, 255, 42, 7]);
    expect(Array.from(decoderBase32(encoderBase32(octets)))).toEqual(Array.from(octets));
  });

  it("ignore espaces et minuscules a la saisie", () => {
    const secret = encoderBase32(new Uint8Array([1, 2, 3, 4, 5]));
    const salie = secret.toLowerCase().replace(/(.{4})/g, "$1 ");
    expect(Array.from(decoderBase32(salie))).toEqual(Array.from(decoderBase32(secret)));
  });
});

describe("verification d'un code", () => {
  const instant = new Date("2026-09-10T12:00:00Z");

  it("accepte le code du moment", async () => {
    const code = await codePourCompteur(SECRET_RFC, compteurPour(instant));
    expect(await verifierCode(SECRET_RFC, code, instant)).toBe(true);
  });

  it("tolere un pas d'avance et de retard, pour l'horloge du telephone", async () => {
    const base = compteurPour(instant);
    for (const ecart of [-1, 1]) {
      const code = await codePourCompteur(SECRET_RFC, base + ecart);
      expect(await verifierCode(SECRET_RFC, code, instant)).toBe(true);
    }
  });

  it("refuse au-dela de la fenetre", async () => {
    const base = compteurPour(instant);
    for (const ecart of [-2, 2, 10]) {
      const code = await codePourCompteur(SECRET_RFC, base + ecart);
      expect(await verifierCode(SECRET_RFC, code, instant)).toBe(false);
    }
  });

  it("accepte les espaces de saisie", async () => {
    const code = await codePourCompteur(SECRET_RFC, compteurPour(instant));
    expect(await verifierCode(SECRET_RFC, `${code.slice(0, 3)} ${code.slice(3)}`, instant)).toBe(true);
  });

  it("refuse tout ce qui n'est pas six chiffres", async () => {
    for (const saisie of ["", "12345", "1234567", "abcdef", "12-345", "000000000"]) {
      expect(await verifierCode(SECRET_RFC, saisie, instant)).toBe(false);
    }
  });
});

describe("secrets et codes de secours", () => {
  it("produit un secret de 20 octets, jamais deux fois le meme", () => {
    const a = genererSecret();
    const b = genererSecret();
    expect(decoderBase32(a)).toHaveLength(20);
    expect(a).not.toBe(b);
  });

  it("produit des codes de secours distincts", () => {
    const codes = genererCodesDeSecours(8);
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const code of codes) expect(code).toMatch(/^[A-Z2-7]{8}$/);
  });

  it("compose une URI lisible par les applications", () => {
    const uri = uriOtpauth("JBSWY3DPEHPK3PXP", "courtier@exemple.fr", "Le Bon Portefeuille");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("algorithm=SHA1");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});
