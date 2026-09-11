/** Espace membre où l’acquéreur dépose ou gère sa demande. */
export const ACQUISITION_APP_PATH = "/app/mandats";

export function acquisitionLoginHref(): string {
  return `/connexion?next=${encodeURIComponent(ACQUISITION_APP_PATH)}`;
}

export function acquisitionContinueHref(opts: {
  loggedIn: boolean;
  canBuy: boolean;
}): string {
  if (opts.loggedIn && opts.canBuy) return ACQUISITION_APP_PATH;
  if (opts.loggedIn) return "/app";
  return acquisitionLoginHref();
}
