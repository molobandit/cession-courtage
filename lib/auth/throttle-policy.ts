/**
 * Regle de verrouillage apres echecs de connexion.
 *
 * Pure, donc testable sans base. Le verrou porte sur l'e-mail vise, ce qui
 * protege un compte precis contre l'essai systematique de mots de passe. Il ne
 * remplace pas une limitation par adresse, qui releve du reseau.
 *
 * Le palier est progressif plutot que definitif : un blocage permanent apres
 * cinq erreurs transforme la protection en moyen de nuire, n'importe qui
 * pouvant verrouiller le compte d'un tiers en connaissant son e-mail.
 */

/** Au-dela de cette inactivite, le compteur d'echecs repart de zero. */
export const FENETRE_MS = 60 * 60 * 1000;

/** Paliers : a partir de N echecs, attendre M millisecondes. */
const PALIERS: { seuil: number; attenteMs: number }[] = [
  { seuil: 20, attenteMs: 60 * 60 * 1000 },
  { seuil: 10, attenteMs: 15 * 60 * 1000 },
  { seuil: 5, attenteMs: 60 * 1000 },
];

/**
 * Duree de verrouillage pour un nombre d'echecs donne.
 * Zero signifie que la tentative suivante est autorisee.
 */
export function attenteApresEchecs(echecs: number): number {
  for (const palier of PALIERS) {
    if (echecs >= palier.seuil) return palier.attenteMs;
  }
  return 0;
}

/** Le compteur doit-il repartir de zero, faute de tentative recente ? */
export function fenetreExpiree(dernierEchec: Date, maintenant: Date): boolean {
  return maintenant.getTime() - dernierEchec.getTime() >= FENETRE_MS;
}

/** Secondes restantes avant de pouvoir reessayer. Zero si la voie est libre. */
export function secondesRestantes(
  verrouJusqua: Date | null,
  maintenant: Date,
): number {
  if (!verrouJusqua) return 0;
  const reste = verrouJusqua.getTime() - maintenant.getTime();
  return reste > 0 ? Math.ceil(reste / 1000) : 0;
}

/** Message affiche a l'utilisateur, sans jamais reveler si le compte existe. */
export function messageVerrou(secondes: number): string {
  if (secondes <= 60) {
    return "Trop de tentatives. Réessayez dans une minute.";
  }
  const minutes = Math.ceil(secondes / 60);
  return `Trop de tentatives. Réessayez dans ${minutes} minutes.`;
}
