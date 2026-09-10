import { describe, expect, it } from "vitest";
import { nextAction, type DashboardState } from "@/lib/dashboard/next-action";

const base: DashboardState = {
  canSell: true,
  canBuy: false,
  portfolioCount: 0,
  unvaluedPortfolioCount: 0,
  draftListing: null,
  retentionDeal: null,
  offersListing: null,
  activeDeal: null,
  openWindowListing: null,
  unvaluedPortfolio: null,
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

describe("l'action suivante mene quelque part", () => {
  it("envoie le releve de retention sur le dossier concerne", () => {
    const a = nextAction({ ...base, retentionDue: 1, retentionDeal: { id: "deal_9" } });
    expect(a.href).toBe("/app/dossiers/deal_9/retention");
  });

  it("envoie l'examen des offres sur l'annonce concernee", () => {
    const a = nextAction({ ...base, offersToReview: 2, offersListing: { id: "lst_3" } });
    expect(a.href).toBe("/app/annonces/lst_3/offres");
  });

  it("ouvre le dossier en cours, et accorde le libelle au nombre", () => {
    const un = nextAction({ ...base, activeDealCount: 1, activeDeal: { id: "deal_1" } });
    expect(un.href).toBe("/app/dossiers/deal_1");
    expect(un.cta).toBe("Ouvrir le dossier");
    const plusieurs = nextAction({ ...base, activeDealCount: 3, activeDeal: { id: "deal_1" } });
    expect(plusieurs.cta).toBe("Ouvrir les dossiers");
  });

  it("montre l'annonce dont la fenetre court, cote public", () => {
    const a = nextAction({ ...base, openWindowDaysLeft: 5, openWindowListing: { publicNumber: 10042 } });
    expect(a.href).toBe("/annonces/10042");
  });

  it("envoie la valorisation sur le portefeuille concerne", () => {
    const a = nextAction({ ...base, unvaluedPortfolioCount: 1, unvaluedPortfolio: { id: "pf_7" } });
    expect(a.href).toBe("/app/portefeuilles/pf_7");
  });

  it("ne renvoie jamais vers le tableau de bord quand une cible existe", () => {
    // Un bouton qui recharge la page ou l'on se trouve deja n'est pas une
    // action : c'est ce que faisaient cinq propositions sur onze.
    const cas = [
      { ...base, retentionDue: 1, retentionDeal: { id: "d" } },
      { ...base, offersToReview: 1, offersListing: { id: "l" } },
      { ...base, activeDealCount: 1, activeDeal: { id: "d" } },
      { ...base, openWindowDaysLeft: 3, openWindowListing: { publicNumber: 1 } },
      { ...base, unvaluedPortfolioCount: 1, unvaluedPortfolio: { id: "p" } },
    ];
    for (const etat of cas) {
      expect(nextAction(etat).href).not.toBe("/app");
    }
  });

  it("retombe sur le tableau de bord si la cible manque, sans casser", () => {
    expect(nextAction({ ...base, retentionDue: 1 }).href).toBe("/app");
  });
});

