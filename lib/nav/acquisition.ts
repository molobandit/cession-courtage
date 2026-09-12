/** Espace membre où l’acquéreur dépose ou gère sa demande. */
export const ACQUISITION_APP_PATH = "/app/mandats";

export function acquisitionLoginHref(): string {
  return `/connexion?next=${encodeURIComponent(ACQUISITION_APP_PATH)}`;
}

export function acquisitionContinueHref(opts: {
  loggedIn: boolean;
  canBuy: boolean;
  subscribed?: boolean;
}): string {
  if (!opts.loggedIn) return acquisitionLoginHref();
  if (!opts.canBuy) return "/app";
  if (opts.subscribed === false) {
    return `/tarifs?next=${encodeURIComponent(ACQUISITION_APP_PATH)}#abonnements`;
  }
  return ACQUISITION_APP_PATH;
}

/** Formulaire public de dépôt d’une demande d’acquisition (une page, comme Assurdeal). */
export const ACQUISITION_REQUEST_PATH = "/annonces/demandes/nouvelle";

export function acquisitionRequestHref(opts: { loggedIn: boolean; canBuy: boolean }): string {
  if (!opts.loggedIn) {
    return `/connexion?next=${encodeURIComponent(ACQUISITION_REQUEST_PATH)}`;
  }
  if (!opts.canBuy) return "/app";
  return ACQUISITION_REQUEST_PATH;
}
