import { describe, expect, it } from "vitest";
import { safeInternalPath, withNextQuery } from "@/lib/nav/safe-next";

describe("safeInternalPath", () => {
  it("accepte un chemin interne", () => {
    expect(safeInternalPath("/annonces/10005")).toBe("/annonces/10005");
    expect(safeInternalPath("/annonces/demandes/nouvelle")).toBe("/annonces/demandes/nouvelle");
  });

  it("refuse une cible ouverte", () => {
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath("//evil.example")).toBeNull();
    expect(safeInternalPath("annonces")).toBeNull();
  });
});

describe("withNextQuery", () => {
  it("ajoute next à l’URL", () => {
    expect(withNextQuery("/tarifs", "/annonces/10005")).toBe(
      "/tarifs?next=%2Fannonces%2F10005",
    );
  });
});
