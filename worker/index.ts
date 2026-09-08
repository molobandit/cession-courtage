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

    return new Response(BODYLESS_STATUS.has(response.status) ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
