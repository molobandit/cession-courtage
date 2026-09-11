import { describe, expect, it } from "vitest";
import {
  canManageListing,
  canViewListing,
  hasOfferWindowExpired,
  identitiesRevealedFor,
  isListingMessageParty,
  listingMessageWhere,
  isOfferWindowSealed,
  offerAccessFor,
} from "@/lib/authz/policies";
import type { Actor } from "@/lib/authz/actor";

const now = new Date("2026-09-07T12:00:00.000Z");

function actor(partial: Partial<Actor> & Pick<Actor, "id" | "firmId">): Actor {
  return {
    email: "a@demo",
    fullName: "A",
    role: "BOTH",
    oriasNumber: "1",
    oriasVerifiedAt: now,
    kycStatus: "VERIFIED",
    publicAlias: "A1",
    ...partial,
  };
}

describe("hasOfferWindowExpired / isOfferWindowSealed", () => {
  it("reste scellée tant que la date n'est pas passée", () => {
    const listing = {
      status: "OFFERS_OPEN" as const,
      offerWindowClosesAt: new Date("2026-09-08T12:00:00.000Z"),
      now,
    };
    expect(hasOfferWindowExpired(listing)).toBe(false);
    expect(isOfferWindowSealed(listing)).toBe(true);
  });

  it("n'est plus scellée après windowClosesAt même si le statut est encore OFFERS_OPEN", () => {
    const listing = {
      status: "OFFERS_OPEN" as const,
      offerWindowClosesAt: new Date("2026-09-06T12:00:00.000Z"),
      now,
    };
    expect(hasOfferWindowExpired(listing)).toBe(true);
    expect(isOfferWindowSealed(listing)).toBe(false);
  });

  it("OFFERS_CLOSED n'est jamais scellé", () => {
    const listing = {
      status: "OFFERS_CLOSED" as const,
      offerWindowClosesAt: new Date("2026-09-06T12:00:00.000Z"),
      now,
    };
    expect(hasOfferWindowExpired(listing)).toBe(false);
    expect(isOfferWindowSealed(listing)).toBe(false);
  });
});

describe("offerAccessFor", () => {
  const seller = actor({ id: "s1", firmId: "f1" });
  const buyer = actor({ id: "b1", firmId: "f2" });
  const listingOpen = {
    status: "OFFERS_OPEN" as const,
    offerWindowClosesAt: new Date("2026-09-28T12:00:00.000Z"),
    portfolio: { firmId: "f1" },
  };

  it("masque tout au cédant pendant la fenêtre", () => {
    expect(offerAccessFor(seller, { ...listingOpen, now })).toBe("sealed");
    expect(offerAccessFor(buyer, { ...listingOpen, now })).toBe("own");
  });

  it("révèle les offres au cédant une fois la fenêtre close", () => {
    const closed = {
      ...listingOpen,
      offerWindowClosesAt: new Date("2026-09-01T12:00:00.000Z"),
      now,
    };
    expect(offerAccessFor(seller, closed)).toBe("full");
    expect(offerAccessFor(buyer, closed)).toBe("own");
  });
});

describe("canViewListing / canManageListing (Marie vs Julien)", () => {
  const marie = actor({ id: "user_seller_01", firmId: "cabinet_01" });
  const draftMarie = { status: "DRAFT" as const, portfolio: { firmId: "cabinet_01" } };
  const publishedJulien = { status: "PUBLISHED" as const, portfolio: { firmId: "cabinet_02" } };
  const draftJulien = { status: "DRAFT" as const, portfolio: { firmId: "cabinet_02" } };

  it("Marie voit son brouillon 10001, pas celui d'un autre cabinet", () => {
    expect(canViewListing(marie, draftMarie)).toBe(true);
    expect(canViewListing(marie, draftJulien)).toBe(false);
    expect(canViewListing(null, draftMarie)).toBe(false);
  });

  it("Marie ne gère pas l'annonce de Julien", () => {
    expect(canManageListing(marie, publishedJulien)).toBe(false);
    expect(canManageListing(marie, draftMarie)).toBe(true);
  });

  it("une annonce publiée reste visible au catalogue (anonyme), sans droit de gestion", () => {
    expect(canViewListing(marie, publishedJulien)).toBe(true);
    expect(canViewListing(null, publishedJulien)).toBe(true);
  });

  it("un portefeuille vendu reste visible, sans droit de gestion", () => {
    const soldJulien = { status: "SOLD" as const, portfolio: { firmId: "cabinet_02" } };
    expect(canViewListing(null, soldJulien)).toBe(true);
    expect(canManageListing(marie, soldJulien)).toBe(false);
  });
});

describe("isListingMessageParty", () => {
  it("autorise le cédant, un offreur ou un participant de dossier — pas un simple canBuy", () => {
    expect(
      isListingMessageParty({
        actorFirmId: "cabinet_01",
        listingFirmId: "cabinet_01",
        hasOffer: false,
        hasDeal: false,
      }),
    ).toBe(true);
    expect(
      isListingMessageParty({
        actorFirmId: "cabinet_buy",
        listingFirmId: "cabinet_01",
        hasOffer: true,
        hasDeal: false,
      }),
    ).toBe(true);
    expect(
      isListingMessageParty({
        actorFirmId: "cabinet_buy",
        listingFirmId: "cabinet_01",
        hasOffer: false,
        hasDeal: false,
      }),
    ).toBe(false);
  });
});

describe("listingMessageWhere (fuite entre acquereurs)", () => {
  const base = { listingId: "listing_1", actorId: "buyer_A", sellerUserId: "seller_1" };

  it("le cedant lit toute la messagerie de son annonce", () => {
    const where = listingMessageWhere({ ...base, actorId: "seller_1", isSeller: true });
    expect(where).toEqual({ listingId: "listing_1" });
    expect(where.OR).toBeUndefined();
  });

  it("un acquereur ne recoit les messages diffuses que s'ils viennent du cedant", () => {
    const where = listingMessageWhere({ ...base, isSeller: false });
    expect(where.OR).toEqual([
      { senderId: "buyer_A" },
      { recipientId: "buyer_A" },
      { recipientId: null, senderId: "seller_1" },
    ]);
  });

  it("ne laisse passer aucun message diffuse par un acquereur concurrent", () => {
    const where = listingMessageWhere({ ...base, isSeller: false });
    const broadcastClauses = (where.OR ?? []).filter(
      (clause) => "recipientId" in clause && clause.recipientId === null,
    );
    // Une seule clause de diffusion, et elle est nominativement celle du cedant.
    expect(broadcastClauses).toHaveLength(1);
    expect(broadcastClauses[0]).toEqual({ recipientId: null, senderId: "seller_1" });
  });

  it("ne diffuse rien si le cedant n'a pas de compte identifie", () => {
    const where = listingMessageWhere({ ...base, isSeller: false, sellerUserId: null });
    expect(where.OR).toEqual([{ senderId: "buyer_A" }, { recipientId: "buyer_A" }]);
  });
});

describe("identitiesRevealedFor", () => {
  it("leve l'anonymat des le depot, sans attendre la LOI", () => {
    expect(identitiesRevealedFor({ stage: "NDA", hasDeposit: true })).toBe(true);
    expect(identitiesRevealedFor({ stage: "DATA_ROOM", hasDeposit: true })).toBe(true);
  });

  it("garde l'anonymat sans depot tant que la LOI n'est pas atteinte", () => {
    expect(identitiesRevealedFor({ stage: "NDA", hasDeposit: false })).toBe(false);
    expect(identitiesRevealedFor({ stage: "DATA_ROOM", hasDeposit: false })).toBe(false);
  });

  it("continue de lever l'anonymat a la LOI pour un dossier sans depot", () => {
    expect(identitiesRevealedFor({ stage: "LOI", hasDeposit: false })).toBe(true);
    expect(identitiesRevealedFor({ stage: "SIGNATURE", hasDeposit: false })).toBe(true);
    expect(identitiesRevealedFor({ stage: "CLOSED", hasDeposit: false })).toBe(true);
  });

  it("ne rend jamais l'anonymat une fois une des deux conditions remplie", () => {
    // Un depot pose sur un dossier deja en LOI ne change rien, et reciproquement.
    expect(identitiesRevealedFor({ stage: "LOI", hasDeposit: true })).toBe(true);
  });
});
