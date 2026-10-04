import { describe, expect, it } from "vitest";
import {
  listingActions,
  listingState,
  listingViewer,
  type ListingState,
  type Viewer,
} from "@/lib/listing/listing-actions";

const ETATS: ListingState[] = ["available", "positioned", "sold"];
const LECTEURS: Viewer[] = ["visitor", "buyer", "positionedBuyer", "pendingBuyer", "seller", "investor"];

describe("l'etat public d'une annonce", () => {
  it("se deduit du statut en base", () => {
    expect(listingState("SOLD")).toBe("sold");
    expect(listingState("UNDER_NEGOTIATION")).toBe("positioned");
    expect(listingState("OFFERS_OPEN")).toBe("available");
    expect(listingState("PUBLISHED")).toBe("available");
  });
});

describe("qui regarde", () => {
  const base = {
    signedIn: true,
    isSeller: false,
    isInvestor: false,
    depositReceived: false,
    depositPending: false,
    canBuy: true,
  };

  it("le cedant passe avant tout le reste", () => {
    expect(listingViewer({ ...base, isSeller: true, depositReceived: true })).toBe("seller");
  });

  it("sans session, c'est un visiteur", () => {
    expect(listingViewer({ ...base, signedIn: false })).toBe("visitor");
  });

  it("le depot recu l'emporte sur le depot en attente", () => {
    expect(listingViewer({ ...base, depositReceived: true, depositPending: true })).toBe("positionedBuyer");
    expect(listingViewer({ ...base, depositPending: true })).toBe("pendingBuyer");
  });

  it("distingue l'investisseur de l'acquereur courtier", () => {
    expect(listingViewer({ ...base, isInvestor: true })).toBe("investor");
    expect(listingViewer(base)).toBe("buyer");
  });
});

describe("une annonce vendue", () => {
  it("ne propose plus rien a personne, et le dit", () => {
    for (const viewer of LECTEURS) {
      const a = listingActions({ state: "sold", viewer });
      expect(a.primary).toBe("none");
      expect(a.notices).toContain("Portefeuille vendu.");
      expect(a.askSeller).toBe(false);
      expect(a.follow).toBe(false);
    }
  });
});

describe("une annonce avec un acquereur positionne", () => {
  it("ouvre le dossier de cession aux deux parties, et a elles seules", () => {
    expect(listingActions({ state: "positioned", viewer: "seller" }).primary).toBe("deal");
    expect(listingActions({ state: "positioned", viewer: "positionedBuyer" }).primary).toBe("deal");
    for (const viewer of ["visitor", "buyer", "investor", "pendingBuyer"] as Viewer[]) {
      expect(listingActions({ state: "positioned", viewer }).primary).toBe("none");
    }
  });

  it("explique la situation au lieu de proposer de se positionner", () => {
    const a = listingActions({ state: "positioned", viewer: "buyer" });
    expect(a.notices[0]).toBe("Un acquéreur est positionné sur ce portefeuille.");
    expect(a.notices[1]).toContain("revient sur le marché");
    expect(a.askSeller).toBe(false);
    expect(a.follow).toBe(true);
  });

  it("dit a celui dont le depot est en traitement ou il en est", () => {
    const a = listingActions({ state: "positioned", viewer: "pendingBuyer" });
    expect(a.notices[0]).toContain("en cours de traitement");
    expect(a.follow).toBe(true);
  });
});

describe("une annonce disponible", () => {
  it("propose de se positionner a qui peut le faire", () => {
    expect(listingActions({ state: "available", viewer: "buyer" }).primary).toBe("takePosition");
    expect(listingActions({ state: "available", viewer: "investor" }).primary).toBe("takePosition");
  });

  it("renvoie le visiteur vers la connexion, sans bouton mort", () => {
    expect(listingActions({ state: "available", viewer: "visitor" }).primary).toBe("signIn");
  });

  it("envoie le cedant gerer son annonce, pas se positionner dessus", () => {
    expect(listingActions({ state: "available", viewer: "seller" }).primary).toBe("manage");
  });

  it("renvoie l'acquereur deja positionne vers son suivi", () => {
    expect(listingActions({ state: "available", viewer: "positionedBuyer" }).primary).toBe("position");
  });
});

describe("la regle generale, sur toutes les combinaisons", () => {
  it("n'affiche jamais une action sans rien dire quand il n'y en a pas", () => {
    for (const state of ETATS) {
      for (const viewer of LECTEURS) {
        const a = listingActions({ state, viewer });
        if (a.primary === "none") expect(a.notices.length).toBeGreaterThan(0);
        // Le dossier de présentation reste lisible dans tous les cas.
        expect(a.study).toBe(true);
      }
    }
  });

  it("ne propose jamais d'ecrire au cedant sur un dossier ferme", () => {
    for (const viewer of LECTEURS) {
      expect(listingActions({ state: "sold", viewer }).askSeller).toBe(false);
    }
    for (const viewer of ["visitor", "buyer", "investor", "pendingBuyer"] as Viewer[]) {
      expect(listingActions({ state: "positioned", viewer }).askSeller).toBe(false);
    }
  });

  it("aucun texte visible ne porte de tiret de ponctuation", () => {
    for (const state of ETATS) {
      for (const viewer of LECTEURS) {
        for (const phrase of listingActions({ state, viewer }).notices) {
          expect(phrase).not.toMatch(/\s[-–—]\s/);
        }
      }
    }
  });
});
