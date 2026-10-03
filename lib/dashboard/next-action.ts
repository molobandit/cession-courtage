import { STUDY_SENTENCE } from "@/lib/copy/market";

/**
 * Determine l'action suivante a proposer dans l'espace membre.
 *
 * Un courtier qui arrive sur son accueil ne doit pas avoir a deduire ce qu'il
 * lui reste a faire : une seule action, la plus urgente, en haut de l'ecran.
 * Fonction pure : la page se contente de lui passer un etat.
 */

export type DashboardState = {
  canSell: boolean;
  canBuy: boolean;
  portfolioCount: number;
  /** Portefeuilles importes mais jamais etudies. */
  unvaluedPortfolioCount: number;
  draftListing: { publicNumber: number; id: string } | null;
  /*
   * Cibles precises des actions proposees.
   *
   * Sans elles, le bouton ne pouvait renvoyer que vers /app, c'est-a-dire la
   * page ou l'on se trouve deja : le clic ne menait nulle part. Une action
   * suivante qui ne mene pas a l'action n'en est pas une.
   */
  /** Dossier attendant un releve de deperdition. */
  retentionDeal: { id: string } | null;
  /** Dossier de cession en cours le plus avance. */
  activeDeal: { id: string } | null;
  /** Portefeuille importe mais pas encore etudie. */
  unvaluedPortfolio: { id: string } | null;
  /** Position prise sans depot de positionnement verse. */
  positionToFund: { id: string; publicNumber: number } | null;
  activeDealCount: number;
  /** Releves de deperdition attendus. */
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
      title: "Un relevé de déperdition vous est demandé",
      detail:
        "Le séquestre de conservation est arrêté sur la déperdition constatée. Sans relevé, rien ne peut être tranché.",
      href: state.retentionDeal ? `/app/dossiers/${state.retentionDeal.id}/retention` : "/app",
      cta: "Saisir le relevé",
    };
  }

  if (state.positionToFund) {
    return {
      tone: "action",
      title: `Dossier n° ${state.positionToFund.publicNumber} : versez votre dépôt de positionnement`,
      detail:
        "Le dépôt de 2,5 % part dans un trust. Il lance la procédure de cession et vous donne le nom du cabinet cédant.",
      href: `/app/positions/${state.positionToFund.id}`,
      cta: "Se positionner",
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

  if (state.canSell && state.draftListing) {
    return {
      tone: "action",
      title: `Votre dossier n° ${state.draftListing.publicNumber} n’est pas encore envoyé`,
      detail:
        "Envoyez-le à l’étude : notre équipe étudie le portefeuille, détermine la valeur, puis met l’annonce en ligne avec le montant correspondant.",
      href: `/app/annonces/${state.draftListing.id}`,
      cta: "Compléter et envoyer",
    };
  }

  if (state.canSell && state.unvaluedPortfolioCount > 0) {
    return {
      tone: "action",
      title: "Un portefeuille attend son étude",
      detail: STUDY_SENTENCE,
      href: state.unvaluedPortfolio ? `/app/portefeuilles/${state.unvaluedPortfolio.id}` : "/app",
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

  if (state.canSell && state.portfolioCount > 0) {
    return {
      tone: "action",
      title: "Confiez votre portefeuille à l’étude",
      detail:
        "Notre équipe réalise l’étude, détermine la valeur, puis met l’annonce en ligne sous un simple numéro de dossier.",
      href: "/app/annonces/nouvelle",
      cta: "Confier mon portefeuille",
    };
  }

  return {
    tone: "calme",
    title: "Rien ne vous attend pour le moment",
    detail: "Vous serez prévenu dès qu’un portefeuille correspondant à vos critères est mis en ligne.",
    href: "/annonces",
    cta: "Voir les portefeuilles",
  };
}
