import { NextResponse } from "next/server";

/**
 * Deconnexion.
 *
 * Volontairement une route, et non une action serveur. Le rendu d'une page
 * appelle `auth()` (l'en-tete affiche le bouton de deconnexion), et Auth.js
 * reemet alors le cookie de session : il ecrase, dans la meme reponse, tout
 * effacement pose par une action. Une route construit sa reponse elle-meme,
 * sans rendu React et sans appel a `auth()` : plus rien ne la reecrit.
 *
 * La session est un JWT, il n'y a rien a invalider cote serveur. Retirer le
 * cookie suffit a fermer l'acces.
 */

/**
 * Le prefixe depend du protocole : `__Secure-` et `__Host-` en HTTPS, nom nu en
 * HTTP local. On couvre les deux, plus les fragments numerotes qu'Auth.js cree
 * lorsque le jeton depasse la taille d'un cookie.
 */
const COOKIES_AUTHJS: string[] = [
  "__Secure-authjs.session-token",
  "__Host-authjs.csrf-token",
  "__Secure-authjs.callback-url",
  "authjs.session-token",
  "authjs.csrf-token",
  "authjs.callback-url",
  ...Array.from({ length: 4 }, (_, i) => `__Secure-authjs.session-token.${i}`),
  ...Array.from({ length: 4 }, (_, i) => `authjs.session-token.${i}`),
];

function deconnecter(origin: string): NextResponse {
  const response = NextResponse.redirect(new URL("/", origin), { status: 303 });
  for (const nom of COOKIES_AUTHJS) {
    response.cookies.set(nom, "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      // `__Secure-` et `__Host-` exigent Secure, sans quoi le navigateur ignore
      // l'effacement au lieu de l'appliquer.
      secure: nom.startsWith("__"),
      maxAge: 0,
      expires: new Date(0),
    });
  }
  return response;
}

export async function POST(request: Request): Promise<NextResponse> {
  return deconnecter(new URL(request.url).origin);
}
