import { describe, expect, it } from "vitest";
import { nextAction, type DashboardState } from "@/lib/dashboard/next-action";

const base: DashboardState = {
  canSell: true,
  canBuy: false,
  portfolioCount: 0,
  unvaluedPortfolioCount: 0,
  draftListing: null,
  retentionDeal: null,
  activeDeal: null,
  unvaluedPortfolio: null,
  positionToFund: null,
  listingWithPositioned: null,
  onlineListing: null,
  activeDealCount: 0,
  retentionDue: 0,
};

describe("nextAction", () => {
  it("dit qui l'on attend sur les dossiers en cours", () => {
    expect(nextAction({ ...base, canBuy: true, activeDealCount: 1 }).detail).toBe(
      "En attente du cédant sur votre dossier.",
    );
    expect(nextAction({ ...base, canBuy: true, activeDealCount: 3 }).detail).toBe(
      "En attente du cédant sur vos 3 dossiers.",
    );
  });

  it("met l'acquereur positionne avant tout le reste, cote cedant", () => {
    const a = nextAction({
      ...base,
      portfolioCount: 2,
      listingWithPositioned: { id: "lst_1", publicNumber: 10005, missingDocs: 4 },
      onlineListing: { id: "lst_1", publicNumber: 10005 },
    });
    expect(a.title).toContain("un acquéreur est positionné");
    expect(a.detail).toContain("4 pièces");
    expect(a.href).toBe("/app/annonces/lst_1");
  });

  it("ne demande pas de confier un portefeuille quand l'annonce est deja en ligne", () => {
    const a = nextAction({ ...base, portfolioCount: 2, onlineListing: { id: "lst_1", publicNumber: 10005 } });
    expect(a.title).toContain("est en ligne");
    expect(a.title).not.toContain("Confiez");
  });

  it("envoie un cedant vierge vers l'import", () => {
    const action = nextAction(base);
    expect(action.href).toBe("/app/import");
    expect(action.tone).toBe("action");
  });

  it("propose l'étude du portefeuille avant la mise en vente", () => {
    const action = nextAction({ ...base, portfolioCount: 1, unvaluedPortfolioCount: 1 });
    expect(action.cta).toBe("Lancer l’étude");
  });

  it("propose de confier le portefeuille une fois étudié", () => {
    const action = nextAction({ ...base, portfolioCount: 1 });
    expect(action.href).toBe("/app/annonces/nouvelle");
  });

  it("signale un dossier non envoyé avant tout le reste", () => {
    const action = nextAction({
      ...base,
      portfolioCount: 1,
      draftListing: { publicNumber: 10001, id: "l1" },
    });
    expect(action.title).toContain("10001");
    expect(action.href).toBe("/app/annonces/l1");
  });

  it("met le dépôt de positionnement avant un dossier en cours", () => {
    const action = nextAction({
      ...base,
      canBuy: true,
      activeDealCount: 2,
      activeDeal: { id: "d1" },
      positionToFund: { id: "p1", publicNumber: 10149 },
    });
    expect(action.href).toBe("/app/positions/p1");
    expect(action.cta).toBe("Se positionner");
  });

  it("ouvre le dossier en cours quand il n'y a rien à verser", () => {
    const action = nextAction({ ...base, activeDealCount: 1, activeDeal: { id: "d1" } });
    expect(action.href).toBe("/app/dossiers/d1");
  });

  it("le relevé de déperdition passe avant tout", () => {
    const action = nextAction({
      ...base,
      retentionDue: 1,
      retentionDeal: { id: "d2" },
      positionToFund: { id: "p1", publicNumber: 10149 },
    });
    expect(action.href).toBe("/app/dossiers/d2/retention");
  });

  it("reste calme quand rien n'attend l'acquéreur", () => {
    const action = nextAction({ ...base, canSell: false, canBuy: true });
    expect(action.tone).toBe("calme");
    expect(action.href).toBe("/annonces");
  });
});
