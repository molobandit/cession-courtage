import { describe, expect, it } from "vitest";
import { nextAction, type DashboardState } from "@/lib/dashboard/next-action";

const base: DashboardState = {
  canSell: true,
  canBuy: false,
  portfolioCount: 0,
  unvaluedPortfolioCount: 0,
  draftListing: null,
  openWindowDaysLeft: null,
  offersToReview: 0,
  activeDealCount: 0,
  mandateCount: 0,
  retentionDue: 0,
};

describe("nextAction", () => {
  it("envoie un cedant vierge vers l'import", () => {
    const action = nextAction(base);
    expect(action.href).toBe("/app/import");
    expect(action.tone).toBe("action");
  });

  it("propose la valorisation avant la publication", () => {
    const action = nextAction({ ...base, portfolioCount: 1, unvaluedPortfolioCount: 1 });
    expect(action.cta).toBe("Lancer la valorisation");
  });

  it("propose de publier une fois le portefeuille valorise", () => {
    const action = nextAction({ ...base, portfolioCount: 1 });
    expect(action.href).toBe("/app/annonces/nouvelle");
  });

  it("signale un brouillon non publie avant tout le reste", () => {
    const action = nextAction({
      ...base,
      portfolioCount: 1,
      draftListing: { publicNumber: 10001, id: "l1" },
    });
    expect(action.title).toContain("10001");
    expect(action.href).toBe("/app/annonces/l1");
  });

  it("passe en attente pendant la fenetre d'offres", () => {
    const action = nextAction({ ...base, portfolioCount: 1, openWindowDaysLeft: 6 });
    expect(action.tone).toBe("attente");
    expect(action.title).toContain("6 jours");
  });

  it("accorde le singulier au dernier jour", () => {
    expect(nextAction({ ...base, openWindowDaysLeft: 1 }).title).toContain("1 jour");
    expect(nextAction({ ...base, openWindowDaysLeft: 0 }).title).toContain("aujourd’hui");
  });

  it("les offres a examiner passent avant un dossier en cours", () => {
    const action = nextAction({ ...base, offersToReview: 3, activeDealCount: 2 });
    expect(action.title).toContain("3 offres");
  });

  it("la retention passe avant tout", () => {
    const action = nextAction({ ...base, retentionDue: 1, offersToReview: 5, activeDealCount: 3 });
    expect(action.title).toContain("rétention");
  });

  it("oriente un acquereur sans mandat", () => {
    const action = nextAction({ ...base, canSell: false, canBuy: true });
    expect(action.href).toBe("/app/mandats");
  });

  it("reste calme quand rien n'est attendu", () => {
    const action = nextAction({
      ...base,
      canSell: false,
      canBuy: true,
      mandateCount: 1,
    });
    expect(action.tone).toBe("calme");
  });
});
