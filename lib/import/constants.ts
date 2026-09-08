export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_LINES = 50_000;
export const PREVIEW_ROWS = 20;
/**
 * Lignes par requête d'insertion.
 *
 * Mesuré sur la base locale : le débit ne dépend quasiment pas de cette valeur
 * (2,02 ms/ligne à 6, 1,76 ms/ligne à 50). Le coût est dominé par le nombre
 * d'allers-retours, pas par leur taille. On reste bas pour garder une marge
 * sous la limite de paramètres liés de D1.
 */
export const LINE_CHUNK = 25;

/**
 * Lignes traitées par requête du navigateur, soit environ une seconde de
 * travail. Assez court pour tenir dans une requête, assez gros pour que la
 * barre de progression avance visiblement.
 */
export const IMPORT_BATCH_ROWS = 500;
