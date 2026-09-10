/**
 * Enveloppe du worker genere par OpenNext.
 *
 * Les en-tetes de securite ne survivent ni au `headers()` de next.config, ni au
 * middleware : OpenNext reconstruit la reponse et les perd. Les poser ici, au
 * dernier maillon avant le reseau, est le seul endroit ou ils sont garantis.
 *
 * Les objets durables exportes par OpenNext doivent etre reexportes tels quels,
 * sans quoi wrangler refuse le deploiement.
 */
import openNextHandler from "../.open-next/worker.js";
import { regle, seuil } from "../lib/rgpd/conservation";

export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from "../.open-next/worker.js";

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    // Next injecte ses scripts d'hydratation en ligne.
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

/** 204 et 304 ne peuvent pas porter de corps : recopier `body` les casserait. */
const BODYLESS_STATUS = new Set([101, 204, 205, 304]);

type Handler = {
  fetch(request: Request, env: unknown, ctx: unknown): Promise<Response>;
};

export default {
  async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
    const response = await (openNextHandler as Handler).fetch(request, env, ctx);

    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(key, value);
    }

    // `new Headers(...)` fusionne les valeurs multiples d'un meme en-tete en une
    // seule chaine separee par des virgules. Set-Cookie n'y survit pas : deux
    // cookies deviennent une valeur unique et illisible, que le navigateur
    // ignore. Auth.js en emet plusieurs a la deconnexion et au changement de
    // compte, d'ou une session qui ne s'efface ni ne se remplace. On les
    // reinjecte donc un par un.
    const setCookies = response.headers.getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      headers.delete("Set-Cookie");
      for (const cookie of setCookies) {
        headers.append("Set-Cookie", cookie);
      }
    }

    return new Response(BODYLESS_STATUS.has(response.status) ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

/**
 * Purge quotidienne, article 5.1.e du RGPD.
 *
 * Declenchee par un cron Cloudflare, pas par une requete : une purge ne doit
 * dependre ni d'un visiteur ni d'une machine allumee.
 *
 * SQL direct sur le binding D1 plutot que Prisma : le gestionnaire planifie
 * s'execute hors du contexte Next, dont depend le client Prisma du projet.
 *
 * Ne touche qu'aux donnees transitoires ou de journalisation. Les pieces
 * contractuelles, soumises a cinq ans, et la neutralisation des comptes
 * inactifs, qui merite une revue humaine, restent hors de ce balayage.
 */
type D1 = {
  prepare(query: string): {
    bind(...values: unknown[]): { run(): Promise<{ meta?: { changes?: number } }> };
  };
};

async function purger(env: unknown): Promise<void> {
  const db = (env as { DB?: D1 }).DB;
  if (!db) return;
  const maintenant = new Date();

  const travaux: { table: string; colonne: string; jours: number }[] = [
    { table: "VerificationToken", colonne: "expires", jours: regle("Jeton de connexion par lien magique").jours },
    { table: "LoginAttempt", colonne: "lastFailedAt", jours: regle("Compteur d’échecs de connexion").jours },
    { table: "Notification", colonne: "createdAt", jours: regle("Notifications").jours },
    { table: "DataRoomView", colonne: "viewedAt", jours: regle("Consultations de la salle de données").jours },
    { table: "AuditLog", colonne: "createdAt", jours: regle("Journal d’audit").jours },
    { table: "DataRequest", colonne: "createdAt", jours: regle("Demandes d’exercice des droits").jours },
  ];

  for (const { table, colonne, jours } of travaux) {
    const limite = seuil(jours, maintenant).toISOString();
    try {
      await db
        .prepare(`DELETE FROM "${table}" WHERE "${colonne}" < ?`)
        .bind(limite)
        .run();
    } catch (error) {
      // Une table absente ou renommee ne doit pas interrompre les suivantes :
      // mieux vaut purger cinq tables sur six que zero.
      console.error(`Purge impossible sur ${table}`, error);
    }
  }
}

export const scheduled = async (
  _controller: unknown,
  env: unknown,
  ctx: { waitUntil(promise: Promise<unknown>): void },
): Promise<void> => {
  ctx.waitUntil(purger(env));
};
