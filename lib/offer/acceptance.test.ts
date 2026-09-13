import { describe, expect, it } from "vitest";
import { listingAcceptsOffers } from "@/lib/offer/acceptance";

describe("annonce ouverte aux offres", () => {
  it("reste ouverte après la clôture de la fenêtre", () => {
    expect(listingAcceptsOffers("OFFERS_OPEN")).toBe(true);
    expect(listingAcceptsOffers("OFFERS_CLOSED")).toBe(true);
    expect(listingAcceptsOffers("PUBLISHED")).toBe(true);
  });

  it("se ferme quand il n’y a plus rien à reprendre", () => {
    expect(listingAcceptsOffers("DRAFT")).toBe(false);
    expect(listingAcceptsOffers("UNDER_NEGOTIATION")).toBe(false);
    expect(listingAcceptsOffers("SOLD")).toBe(false);
    expect(listingAcceptsOffers("WITHDRAWN")).toBe(false);
  });
});
