/**
 * Second facteur par code temporaire, RFC 6238 (TOTP) sur RFC 4226 (HOTP).
 *
 * Aucun prestataire, aucun SMS : le secret est partage une fois avec
 * l'application d'authentification du courtier, puis chacun calcule le meme
 * code de son cote. Le SMS a ete ecarte volontairement, il est interceptable
 * par portage de numero et coute a chaque envoi.
 *
 * SHA-1 n'est pas un choix de confort mais d'interoperabilite : c'est
 * l'algorithme que toutes les applications lisent. Sa faiblesse porte sur la
 * resistance aux collisions, sans effet ici ou il sert de HMAC sur un compteur
 * de temps, avec un secret et une validite de trente secondes.
 */

const PAS_SECONDES = 30;
const CHIFFRES = 6;
const ALPHABET_B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Secret de 20 octets, la taille recommandee par la RFC 4226 pour SHA-1. */
export function genererSecret(): string {
  const octets = crypto.getRandomValues(new Uint8Array(20));
  return encoderBase32(octets);
}

export function encoderBase32(octets: Uint8Array): string {
  let bits = 0;
  let valeur = 0;
  let sortie = "";
  for (const octet of octets) {
    valeur = (valeur << 8) | octet;
    bits += 8;
    while (bits >= 5) {
      sortie += ALPHABET_B32[(valeur >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) sortie += ALPHABET_B32[(valeur << (5 - bits)) & 31];
  return sortie;
}

export function decoderBase32(secret: string): Uint8Array {
  const propre = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let valeur = 0;
  const octets: number[] = [];
  for (const caractere of propre) {
    const index = ALPHABET_B32.indexOf(caractere);
    if (index === -1) continue;
    valeur = (valeur << 5) | index;
    bits += 5;
    if (bits >= 8) {
      octets.push((valeur >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(octets);
}

/** Code attendu pour un pas de temps donne. */
export async function codePourCompteur(secret: string, compteur: number): Promise<string> {
  const message = new Uint8Array(8);
  let reste = compteur;
  for (let i = 7; i >= 0; i -= 1) {
    message[i] = reste & 255;
    reste = Math.floor(reste / 256);
  }

  const cle = await crypto.subtle.importKey(
    "raw",
    decoderBase32(secret) as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", cle, message as BufferSource));

  // Troncature dynamique de la RFC 4226 : les quatre derniers bits designent
  // l'octet de depart, ce qui evite de toujours lire la meme portion du HMAC.
  const decalage = signature[signature.length - 1] & 0x0f;
  const binaire =
    ((signature[decalage] & 0x7f) << 24) |
    ((signature[decalage + 1] & 0xff) << 16) |
    ((signature[decalage + 2] & 0xff) << 8) |
    (signature[decalage + 3] & 0xff);

  return String(binaire % 10 ** CHIFFRES).padStart(CHIFFRES, "0");
}

export function compteurPour(maintenant: Date): number {
  return Math.floor(maintenant.getTime() / 1000 / PAS_SECONDES);
}

/**
 * Verifie un code, avec une tolerance d'un pas avant et apres.
 *
 * Cette fenetre absorbe le decalage d'horloge du telephone et le temps de
 * frappe. Plus large, elle multiplierait les codes valables simultanement ;
 * plus etroite, elle rejetterait des codes honnetes.
 */
export async function verifierCode(
  secret: string,
  saisie: string,
  maintenant = new Date(),
): Promise<boolean> {
  const propre = saisie.replace(/\s/g, "");
  if (!/^\d{6}$/.test(propre)) return false;

  const base = compteurPour(maintenant);
  for (const ecart of [-1, 0, 1]) {
    const attendu = await codePourCompteur(secret, base + ecart);
    if (egaliteConstante(attendu, propre)) return true;
  }
  return false;
}

/** Comparaison a temps constant : la duree ne dit pas combien de chiffres collent. */
function egaliteConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** URI otpauth, lue par toutes les applications d'authentification. */
export function uriOtpauth(secret: string, email: string, emetteur: string): string {
  const libelle = encodeURIComponent(`${emetteur}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer: emetteur,
    algorithm: "SHA1",
    digits: String(CHIFFRES),
    period: String(PAS_SECONDES),
  });
  return `otpauth://totp/${libelle}?${params.toString()}`;
}

/**
 * Codes de secours, utilisables une seule fois.
 *
 * Sans eux, un telephone perdu ferme definitivement le compte. Ils sont
 * stockes haches, exactement comme un mot de passe : la base ne doit pas
 * permettre de se connecter.
 */
export function genererCodesDeSecours(nombre = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < nombre; i += 1) {
    const octets = crypto.getRandomValues(new Uint8Array(5));
    codes.push(encoderBase32(octets).slice(0, 8));
  }
  return codes;
}

/**
 * Empreinte d'un code de secours.
 *
 * SHA-256 en une passe, et non PBKDF2 : un code de secours est tire au hasard
 * sur quarante bits, il n'a pas la faiblesse d'un mot de passe choisi par un
 * humain. Les centaines de milliers d'iterations qui protegent un mot de passe
 * n'apporteraient rien ici, et huit hachages lourds depassent le budget
 * processeur d'un Worker. C'est le meme traitement que les jetons de lien
 * magique, pour la meme raison.
 */
export async function empreinteCodeDeSecours(code: string): Promise<string> {
  const propre = code.trim().toUpperCase().replace(/\s/g, "");
  const bits = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(propre));
  return Array.from(new Uint8Array(bits))
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}
