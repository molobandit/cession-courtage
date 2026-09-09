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
      href: "/app",
      cta: "Voir les dossiers",
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
        "La fenêtre est close, les propositions sont visibles. Vous restez libre de toutes les refuser.",
      href: "/app",
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
      href: "/app",
      cta: "Ouvrir les dossiers",
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
      href: "/app",
      cta: "Voir mon annonce",
    };
  }

  if (state.canSell && state.draftListing) {
    return {
      tone: "action",
      title: `Votre annonce #${state.draftListing.publicNumber} est encore en brouillon`,
      detail: "Tant qu’elle n’est pas publiée, aucun acquéreur ne peut la voir.",
      href: `/app/annonces/${state.draftListing.id}`,
      cta: "Compléter et publier",
    };
  }

  if (state.canSell && state.unvaluedPortfolioCount > 0) {
    return {
      tone: "action",
      title: "Un portefeuille attend sa valorisation",
      detail:
        "La cascade détaille l’impact en euros de chaque poste, et indique les correctifs les plus rentables.",
      href: "/app",
      cta: "Lancer la valorisation",
    };
  }

  if (state.canSell && state.portfolioCount === 0) {
    return {
      tone: "action",
      title: "Commencez par importer votre portefeuille",
      detail:
        "Un bordereau CSV ou XLSX suffit. Les colonnes nominatives sont refusées à l’import.",
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
      title: "Publiez une annonce",
      detail:
        "Votre portefeuille est prêt. L’annonce paraît sous alias, sans raison sociale ni commune.",
      href: "/app/annonces/nouvelle",
      cta: "Créer une annonce",
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
