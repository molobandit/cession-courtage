/**
 * Identite legale de l'editeur.
 *
 * ATTENTION : ces valeurs sont des ESPACES RESERVES. Elles doivent etre
 * completees avec les informations reelles avant toute mise en ligne publique.
 * L'article 6-III de la loi pour la confiance dans l'economie numerique impose
 * que l'editeur d'un service en ligne soit identifiable.
 *
 * Un seul fichier a renseigner : toutes les pages legales lisent ces constantes.
 */

export const LEGAL_PLACEHOLDER = "À compléter";

/** Vrai tant que l'identite n'a pas ete renseignee : affiche un avertissement. */
export function legalIdentityIncomplete(): boolean {
  return Object.values(PUBLISHER).some((value) => value === LEGAL_PLACEHOLDER);
}

export const PUBLISHER = {
  legalName: "La bourse du portefeuille",
  legalForm: LEGAL_PLACEHOLDER,
  shareCapital: LEGAL_PLACEHOLDER,
  siren: LEGAL_PLACEHOLDER,
  rcsCity: LEGAL_PLACEHOLDER,
  vatNumber: LEGAL_PLACEHOLDER,
  address: LEGAL_PLACEHOLDER,
  email: LEGAL_PLACEHOLDER,
  phone: LEGAL_PLACEHOLDER,
  publicationDirector: LEGAL_PLACEHOLDER,
} as const;

export const HOST = {
  name: "Cloudflare, Inc.",
  address: "101 Townsend Street, San Francisco, CA 94107, États-Unis",
  website: "https://www.cloudflare.com",
} as const;

/** Autorite de controle competente en matiere de donnees personnelles. */
export const DATA_AUTHORITY = {
  name: "Commission nationale de l’informatique et des libertés",
  shortName: "CNIL",
  address: "3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07",
  website: "https://www.cnil.fr",
} as const;

export const LAST_UPDATED = "08/09/2026";
