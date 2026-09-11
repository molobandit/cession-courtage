import { describe, expect, it } from "vitest";
import { sendLoggedInVisitorToApp } from "@/lib/nav/logged-in-public";

describe("sendLoggedInVisitorToApp", () => {
  it("bloque l'accueil et les pages vitrine", () => {
    expect(sendLoggedInVisitorToApp("/")).toBe(true);
    expect(sendLoggedInVisitorToApp("/ceder")).toBe(true);
    expect(sendLoggedInVisitorToApp("/acquerir")).toBe(true);
    expect(sendLoggedInVisitorToApp("/connexion")).toBe(false);
    expect(sendLoggedInVisitorToApp("/investisseurs/opportunites")).toBe(false);
    expect(sendLoggedInVisitorToApp("/investisseurs")).toBe(false);
  });

  it("laisse le catalogue, les tarifs et l'espace membre", () => {
    expect(sendLoggedInVisitorToApp("/annonces")).toBe(false);
    expect(sendLoggedInVisitorToApp("/annonces/12")).toBe(false);
    expect(sendLoggedInVisitorToApp("/tarifs")).toBe(false);
    expect(sendLoggedInVisitorToApp("/connexion")).toBe(false);
    expect(sendLoggedInVisitorToApp("/app")).toBe(false);
    expect(sendLoggedInVisitorToApp("/mentions-legales")).toBe(false);
    expect(sendLoggedInVisitorToApp("/en-attente-orias")).toBe(false);
  });
});
