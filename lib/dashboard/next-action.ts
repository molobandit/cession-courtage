/**
 * Determine l'action suivante a proposer dans l'espace membre.
 *
 * Un courtier qui arrive sur son tableau ne doit pas avoir a deduire ce qu'il
 * lui reste a faire. Fonction pure : la page se contente de lui passer un etat.
 */

export type DashboardState = {
  canSell: boolean;
  canBuy: boolean;
  portfolioCount: number;
  /** Portefeuilles importes mais jamais valorises. */
  unvaluedPortfolioCount: number;
  draftListing: { publicNumber: number; id: string } | null;
  /*
   * Cibles precises des actions proposees.
   *
   * Sans elles, le bouton ne pouvait renvoyer que vers /app, c'est-a-dire la
   * page ou l'on se trouve deja : le clic ne menait nulle part. Une action
   * suivante qui ne mene pas a l'action n'en est pas une.
   */
  /** Dossier attendant un releve de retention. */
  retentionDeal: { id: string } | null;
  /** Annonce dont la fenetre est close et dont les offres sont visibles. */
  offersListing: { id: string } | null;
  /** Dossier en cours le plus avance. */
  activeDeal: { id: string } | null;
  /** Annonce dont la fenetre d'offres court encore. */
  openWindowListing: { publicNumber: number } | null;
  /** Portefeuille importe mais pas encore valorise. */
  unvaluedPortfolio: { id: string } | null;
  /** Fenetre d'offres en cours : jours restants avant cloture. */
  openWindowDaysLeft: number | null;
  /** Offres a examiner sur une fenetre close. */
  offersToReview: number;
  activeDealCount: number;
  mandateCount: number;
  /** Releves de retention attendus. */
  retentionDue: number;
};

export type NextAction = {
  tone: "action" | "attente" | "calme";
  title: string;
  detail: string;
  href: string;
  cta: string;
};

export function nextAction(state: DashboardState): NextAction {
  if (state.retentionDue > 0) {
    return {
      tone: "action",
      title: "Un relevé de rétention vous est demandé",
      detail:
        "Le montant différé est recalculé sur le taux constaté. Sans relevé, l’ajustement ne peut pas être arrêté.",
      href: state.retentionDeal ? `/app/dossiers/${state.retentionDeal.id}/retention` : "/app",
      cta: "Saisir le relevé",
    };
  }

  if (state.offersToReview > 0) {
    return {
      tone: "action",
      title:
        state.offersToReview === 1
          ? "Une offre vous attend"
          : `${state.offersToReview} offres vous attendent`,
      detail:
        "Comparez les propositions : vous en retenez une à la clôture de la séance, ou aucune.",
      href: state.offersListing ? `/app/annonces/${state.offersListing.id}/offres` : "/app",
      cta: "Examiner les offres",
    };
  }

  if (state.activeDealCount > 0) {
    return {
      tone: "action",
      title:
        state.activeDealCount === 1
          ? "Un dossier est en cours"
          : `${state.activeDealCount} dossiers sont en cours`,
      detail: "La partie qui n’a pas agi bloque l’étape suivante.",
      href: state.activeDeal ? `/app/dossiers/${state.activeDeal.id}` : "/app",
      cta: state.activeDealCount === 1 ? "Ouvrir le dossier" : "Ouvrir les dossiers",
    };
  }

  if (state.openWindowDaysLeft !== null) {
    const jours = state.openWindowDaysLeft;
    return {
      tone: "attente",
      title:
        jours <= 0
          ? "Votre fenêtre d’offres se clôture aujourd’hui"
          : `Votre fenêtre d’offres se clôture dans ${jours} jour${jours > 1 ? "s" : ""}`,
      detail:
        "Les montants restent masqués jusqu’à la clôture, y compris pour vous. Rien à faire d’ici là.",
      href: state.openWindowListing
        ? `/annonces/${state.openWindowListing.publicNumber}`
        : "/app",
      cta: "Voir mon annonce",
    };
  }

  if (state.canSell && state.draftListing) {
    return {
      tone: "action",
      title: `Votre dossier n° ${state.draftListing.publicNumber} n’est pas encore soumis`,
      detail: "Soumettez-le : notre équipe réalise l’étude du portefeuille, fixe le prix, puis met l’annonce en ligne.",
      href: `/app/annonces/${state.draftListing.id}`,
      cta: "Compléter et soumettre",
    };
  }

  if (state.canSell && state.unvaluedPortfolioCount > 0) {
    return {
      tone: "action",
      title: "Un portefeuille attend son étude",
      detail:
        "L’étude met en évidence les éléments et les caractéristiques de votre portefeuille.",
      href: state.unvaluedPortfolio
        ? `/app/portefeuilles/${state.unvaluedPortfolio.id}`
        : "/app",
      cta: "Lancer l’étude",
    };
  }

  if (state.canSell && state.portfolioCount === 0) {
    return {
      tone: "action",
      title: "Commencez par importer votre portefeuille",
      detail: "Un bordereau CSV ou XLSX suffit.",
      href: "/app/import",
      cta: "Importer un bordereau",
    };
  }

  if (state.canBuy && state.mandateCount === 0) {
    return {
      tone: "action",
      title: "Déposez un mandat d’achat",
      detail:
        "Décrivez une fois ce que vous cherchez. Les dossiers correspondants vous seront présentés automatiquement.",
      href: "/app/mandats",
      cta: "Déposer un mandat",
    };
  }

  if (state.canSell && state.portfolioCount > 0) {
    return {
      tone: "action",
      title: "Proposez votre portefeuille à la vente",
      detail:
        "Soumettez votre dossier : notre équipe réalise l’étude, fixe le prix, puis met l’annonce en ligne sous alias.",
      href: "/app/annonces/nouvelle",
      cta: "Soumettre mon dossier",
    };
  }

  return {
    tone: "calme",
    title: "Rien ne vous attend pour le moment",
    detail:
      "Vous serez prévenu dès qu’un dossier correspondant à vos critères est mis en ligne.",
    href: "/annonces",
    cta: "Parcourir les annonces",
  };
}
