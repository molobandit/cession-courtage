import { describe, expect, it } from "vitest";
import { hashPassword, needsRehash, verifyPassword } from "./password";

describe("hachage mot de passe", () => {
  it("stocke 100 000 iterations, le plafond Workers", async () => {
    const stored = await hashPassword("Phrase-secrete-12");
    expect(stored.startsWith("pbkdf2$100000$")).toBe(true);
    expect(needsRehash(stored)).toBe(false);
  });

  it("accepte le mot de passe exact et refuse le voisin", async () => {
    const stored = await hashPassword("Phrase-secrete-12");
    expect(await verifyPassword("Phrase-secrete-12", stored)).toBe(true);
    expect(await verifyPassword("Phrase-secrete-13", stored)).toBe(false);
    expect(await verifyPassword("Phrase-secrete-12", "not-a-hash")).toBe(false);
  });

  it("signale une empreinte trop faible pour la remettre a niveau", () => {
    expect(needsRehash("pbkdf2$1000$YQ==$YQ==")).toBe(true);
    expect(needsRehash("bcrypt$whatever")).toBe(true);
  });
});
