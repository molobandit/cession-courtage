import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requiresSession } from "@/auth.config";

/**
 * Noms possibles du cookie de session, selon le protocole.
 * En HTTPS Auth.js prefixe par `__Secure-`, en HTTP local il ne prefixe pas.
 */
const COOKIES_SESSION = ["__Secure-authjs.session-token", "authjs.session-token"];

/**
 * En-tetes de securite pour le developpement local uniquement.
 *
 * En production, c'est worker/index.ts qui les pose : OpenNext reconstruit la
 * reponse et perd aussi bien le `headers()` de next.config que ceux du
 * middleware. L'enveloppe du worker est le dernier maillon avant le reseau,
 * donc le seul endroit fiable. Ici, ils couvrent `next dev`, ou cette
 * enveloppe ne s'execute pas.
 */
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

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Garde de session, sans Auth.js.
 *
 * `auth()` reemet le cookie de session a chaque requete pour prolonger la
 * fenetre glissante, et Next fusionne ce cookie PAR-DESSUS celui pose par une
 * action serveur. La deconnexion effacait donc bien le cookie, que le
 * middleware reposait aussitot : la session survivait au clic.
 *
 * Ici on se contente de constater la PRESENCE d'un cookie de session pour
 * eviter un aller-retour inutile. La validite, elle, est verifiee la ou elle
 * compte : `requireActor()` dans les layouts et les gardes de chaque requete.
 * Un cookie invalide passe ce filtre et se fait refuser juste apres.
 */
export default function middleware(request: NextRequest) {
  const aUnCookieDeSession = COOKIES_SESSION.some((nom) => request.cookies.has(nom));

  if (requiresSession(request.nextUrl.pathname) && !aUnCookieDeSession) {
    const target = new URL("/connexion", request.nextUrl.origin);
    target.searchParams.set("callbackUrl", request.nextUrl.href);
    return withSecurityHeaders(NextResponse.redirect(target));
  }
  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  // `api/auth` est exclu volontairement : ce sont les routes d'Auth.js, qui
  // posent elles-memes les cookies de session et de CSRF. Les faire passer par
  // l'intercepteur produit deux jetons concurrents pour un meme cookie, et la
  // deconnexion comme le changement de compte cessent alors de fonctionner.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|txt|xml)$).*)"],
};
