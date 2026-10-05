import "server-only";
import { NextResponse } from "next/server";

/**
 * Ce qu'on affiche quand une pièce ne s'ouvre pas.
 *
 * Ces adresses sont suivies depuis un lien, pas appelées par du code : un
 * objet JSON à l'écran ne dit rien à qui a cliqué. Une page, une phrase, un
 * bouton pour revenir. Le motif n'est pas précisé, qu'il s'agisse d'un droit
 * manquant, d'une pièce inconnue ou d'un fichier absent du stockage : c'est la
 * même règle que partout, un accès qu'on n'a pas se présente comme une page
 * qui n'existe pas.
 */
export function documentUnavailable(): NextResponse {
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Document indisponible</title>
<style>
  :root { color-scheme: light }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px;
    font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #f5f6f8; color: #111827 }
  main { max-width: 32rem; text-align: center; background: #fff; border: 1px solid #e5e7eb;
    border-radius: 24px; padding: 40px 28px }
  h1 { margin: 0; font-size: 19px; font-weight: 700 }
  p { margin: 12px 0 0; color: #5f6b7a }
  a { display: inline-flex; align-items: center; height: 44px; margin-top: 24px; padding: 0 22px;
    border-radius: 999px; background: #4338ca; color: #fff; font-weight: 600; text-decoration: none }
</style>
</head>
<body>
  <main>
    <h1>Ce document n&rsquo;est pas disponible pour le moment.</h1>
    <p>Réessayez dans quelques instants. S&rsquo;il ne s&rsquo;ouvre toujours pas, signalez-le nous depuis la messagerie du dossier.</p>
    <a href="/app/documents" onclick="if (history.length > 1) { event.preventDefault(); history.back(); }">Retour</a>
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
