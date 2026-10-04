/**
 * Ce qu'une fiche d'annonce propose, selon son état et selon qui la regarde.
 *
 * La règle tient en une phrase : un bouton affiché mène toujours quelque part.
 * Une action impossible n'est pas grisée ni laissée en place pour échouer au
 * clic, elle disparaît et une phrase dit pourquoi. Aucun message technique,
 * jamais de « ce dossier n'existe pas ».
 *
 * Fonction pure, sans base ni session : elle reçoit l'état et le lecteur, et
 * se teste combinaison par combinaison.
 */

/** Les trois états publics d'une annonce, ceux de la salle de marché. */
export type ListingState = "available" | "positioned" | "sold";

/** Qui regarde. Un seul rôle à la fois, le plus proche du dossier l'emporte. */
export type Viewer =
  /** Pas de session. */
  | "visitor"
  /** Connecté, peut acheter, aucun dépôt sur ce dossier. */
  | "buyer"
  /** S'est positionné sur ce dossier, son dépôt est reçu. */
  | "positionedBuyer"
  /** A versé, le règlement n'est pas encore confirmé. */
  | "pendingBuyer"
  /** Le cédant de cette annonce. */
  | "seller"
  /** Compte investisseur, sans ORIAS. */
  | "investor";

export type ListingActions = {
  /**
   * L'action principale du panneau bleu. `none` quand aucune n'est possible,
   * et c'est alors `notices` qui parle.
   */
  primary: "deal" | "position" | "takePosition" | "manage" | "signIn" | "none";
  /** Ce qu'on explique à la place de ce qui n'est pas proposé. */
  notices: string[];
  /** Poser une question au cédant. */
  askSeller: boolean;
  /** Suivre ce dossier, pour être prévenu s'il revient sur le marché. */
  follow: boolean;
  /** Le dossier de présentation reste lisible dans tous les cas. */
  study: true;
};

const EN_COURS =
  "La procédure de cession est en cours. Si elle n’aboutit pas, le portefeuille revient sur le marché.";

/** Partie au dossier en cours : seuls ces deux-là ouvrent le dossier de cession. */
function estPartie(viewer: Viewer): boolean {
  return viewer === "seller" || viewer === "positionedBuyer";
}

export function listingActions(input: { state: ListingState; viewer: Viewer }): ListingActions {
  const { state, viewer } = input;
  const base = { askSeller: false, follow: false, study: true } as const;

  // Vendu : plus rien à faire, pour personne. Le dossier reste lisible.
  if (state === "sold") {
    return { ...base, primary: "none", notices: ["Portefeuille vendu."] };
  }

  // Un acquéreur est positionné : le marché est fermé, sauf pour les parties.
  if (state === "positioned") {
    if (viewer === "seller") {
      return { ...base, primary: "deal", notices: [], askSeller: true };
    }
    if (viewer === "positionedBuyer") {
      return { ...base, primary: "deal", notices: [], askSeller: true };
    }
    if (viewer === "pendingBuyer") {
      return {
        ...base,
        primary: "none",
        notices: ["Votre dépôt de positionnement est en cours de traitement.", EN_COURS],
        follow: true,
      };
    }
    return {
      ...base,
      primary: "none",
      notices: ["Un acquéreur est positionné sur ce portefeuille.", EN_COURS],
      follow: true,
    };
  }

  // Disponible.
  switch (viewer) {
    case "seller":
      return { ...base, primary: "manage", notices: [] };
    case "positionedBuyer":
      return { ...base, primary: "position", notices: [], askSeller: true };
    case "pendingBuyer":
      return {
        ...base,
        primary: "position",
        notices: ["Votre dépôt de positionnement est en cours de traitement."],
        askSeller: true,
      };
    case "buyer":
      return { ...base, primary: "takePosition", notices: [], askSeller: true };
    case "investor":
      return { ...base, primary: "takePosition", notices: [], askSeller: true };
    default:
      return { ...base, primary: "signIn", notices: [], askSeller: true };
  }
}

/** L'état public d'une annonce, à partir de son statut en base. */
export function listingState(status: string): ListingState {
  if (status === "SOLD") return "sold";
  if (status === "UNDER_NEGOTIATION") return "positioned";
  return "available";
}

/** Qui regarde, à partir de ce que la page sait déjà. */
export function listingViewer(input: {
  signedIn: boolean;
  isSeller: boolean;
  isInvestor: boolean;
  /** Dépôt reçu, c'est à dire réglé : voir depositReleasesIdentity. */
  depositReceived: boolean;
  /** Dépôt posé, règlement non confirmé. */
  depositPending: boolean;
  canBuy: boolean;
}): Viewer {
  if (input.isSeller) return "seller";
  if (!input.signedIn) return "visitor";
  if (input.depositReceived) return "positionedBuyer";
  if (input.depositPending) return "pendingBuyer";
  if (input.isInvestor) return "investor";
  if (input.canBuy) return "buyer";
  return "visitor";
}

export { EN_COURS as CESSION_EN_COURS };
