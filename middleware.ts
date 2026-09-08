import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig, requiresSession } from "@/auth.config";

const { auth } = NextAuth(authConfig);

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

export default auth((request) => {
  // Passer un gabarit a auth() court-circuite le rappel `authorized` : la garde
  // de session doit donc etre refaite ici, sinon /app et /admin s'ouvrent a tous.
  if (requiresSession(request.nextUrl.pathname) && !request.auth?.user?.id) {
    const target = new URL("/connexion", request.nextUrl.origin);
    target.searchParams.set("callbackUrl", request.nextUrl.href);
    return withSecurityHeaders(NextResponse.redirect(target));
  }
  return withSecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|txt|xml)$).*)"],
};
