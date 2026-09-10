/**
 * Hachage de mot de passe compatible Cloudflare Workers.
 *
 * bcryptjs est du JavaScript pur : a 12 tours il consomme plusieurs centaines de
 * millisecondes de processeur, ce qui depasse le budget d'un Worker. PBKDF2 par
 * Web Crypto est implemente nativement par le moteur, donc bien plus rapide, et
 * disponible aussi bien sur Workers qu'en developpement Node.
 *
 * Format stocke : pbkdf2$<iterations>$<sel base64>$<empreinte base64>
 */

const ALGORITHM = "PBKDF2";
const HASH = "SHA-256";
/**
 * 600 000 iterations, la recommandation OWASP en vigueur pour PBKDF2-SHA256.
 * Mesure : environ 70 ms, largement dans le budget d'un Worker pour une
 * operation aussi rare qu'une connexion. Le nombre est inscrit dans l'empreinte,
 * donc les comptes hachees a 100 000 continuent de fonctionner et sont
 * remis a niveau a leur prochaine connexion reussie.
 */
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;
const PREFIX = "pbkdf2";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(
  plain: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plain),
    ALGORITHM,
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: ALGORITHM, salt: salt as BufferSource, iterations, hash: HASH },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** Comparaison a temps constant : ne renseigne pas sur la position d'un ecart. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derive(plain, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== PREFIX) return false;

  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = fromBase64(parts[2]);
    expected = fromBase64(parts[3]);
  } catch {
    return false;
  }

  const derived = await derive(plain, salt, iterations);
  return timingSafeEqual(derived, expected);
}

/**
 * Vrai si l'empreinte a ete produite avec moins d'iterations que la norme
 * actuelle. Permet de remettre un compte a niveau lors d'une connexion reussie,
 * sans jamais demander a l'utilisateur de changer son mot de passe.
 */
export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== PREFIX) return true;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations)) return true;
  return iterations < ITERATIONS;
}

/**
 * Empreinte leurre, verifiee lorsqu'aucun compte ne correspond a l'e-mail.
 *
 * Sans elle, un e-mail inconnu repond immediatement tandis qu'un e-mail connu
 * paie les 70 ms de PBKDF2 : l'ecart suffit a enumerer les comptes existants.
 * On depense donc le meme temps dans les deux cas.
 */
const DUMMY_SALT = new Uint8Array(SALT_BYTES);

export async function burnPasswordTime(plain: string): Promise<void> {
  await derive(plain, DUMMY_SALT, ITERATIONS);
}
