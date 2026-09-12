import { describe, expect, it } from "vitest";
import {
  stripeKeyRefusal,
  stripeKeyUsable,
  stripeModeFromKey,
} from "@/lib/billing/stripe-mode";

describe("mode déduit de la clé", () => {
  it("reconnaît l’essai et le direct", () => {
    expect(stripeModeFromKey("sk_test_abc123")).toBe("test");
    expect(stripeModeFromKey("sk_live_abc123")).toBe("live");
  });

  it("refuse une clé absente, vide ou d’un autre type", () => {
    expect(stripeModeFromKey(undefined)).toBeNull();
    expect(stripeModeFromKey("")).toBeNull();
    // Une cle publiable n'a rien a faire cote serveur : elle ne signe rien.
    expect(stripeModeFromKey("pk_test_abc123")).toBeNull();
    // « sk_ » seul ne suffit pas : le mode doit etre lisible sans ambiguite.
    expect(stripeModeFromKey("sk_abc123")).toBeNull();
  });

  it("tolère les espaces d’un copier-coller", () => {
    expect(stripeModeFromKey("  sk_test_abc123  ")).toBe("test");
  });
});

describe("clé utilisable", () => {
  it("laisse toujours passer l’essai", () => {
    expect(stripeKeyUsable("sk_test_abc", undefined)).toBe(true);
    expect(stripeKeyUsable("sk_test_abc", "false")).toBe(true);
  });

  it("refuse le direct tant qu’il n’est pas autorisé", () => {
    // C'est la garde qui compte : une cle live collee par megarde sur un site
    // de demonstration encaisserait un vrai abonnement.
    expect(stripeKeyUsable("sk_live_abc", undefined)).toBe(false);
    expect(stripeKeyUsable("sk_live_abc", "")).toBe(false);
    expect(stripeKeyUsable("sk_live_abc", "1")).toBe(false);
    expect(stripeKeyUsable("sk_live_abc", "TRUE")).toBe(false);
  });

  it("ouvre le direct sur autorisation explicite", () => {
    expect(stripeKeyUsable("sk_live_abc", "true")).toBe(true);
  });

  it("refuse une clé absente dans tous les cas", () => {
    expect(stripeKeyUsable(undefined, "true")).toBe(false);
  });
});

describe("motif du refus", () => {
  it("ne dit rien quand la clé passe", () => {
    expect(stripeKeyRefusal("sk_test_abc", undefined)).toBeNull();
  });

  it("distingue la clé manquante de la clé directe non autorisée", () => {
    expect(stripeKeyRefusal(undefined, undefined)).toContain("absente");
    expect(stripeKeyRefusal("sk_live_abc", undefined)).toContain("STRIPE_ALLOW_LIVE");
  });
});
