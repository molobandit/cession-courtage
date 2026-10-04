import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { PresentationDossierOptions } from "@/lib/listing/presentation-dossier";

/**
 * Images et police du dossier, en data URL.
 *
 * Le navigateur qui imprime le PDF ne voit pas forcément le site (en local,
 * il tourne chez Cloudflare et n'atteint pas localhost) : tout est donc
 * intégré au HTML. Les fichiers sont lus dans les assets du worker, sinon sur
 * l'origine de la requête, puis gardés en mémoire.
 */

const FICHIERS = {
  mark: ["/brand/mark.png", "image/png"],
  founder: ["/brand/djesi.jpg", "image/jpeg"],
  f400: ["/fonts/ibm-plex-sans-latin-400-normal.woff2", "font/woff2"],
  f500: ["/fonts/ibm-plex-sans-latin-500-normal.woff2", "font/woff2"],
  f600: ["/fonts/ibm-plex-sans-latin-600-normal.woff2", "font/woff2"],
  f700: ["/fonts/ibm-plex-sans-latin-700-normal.woff2", "font/woff2"],
} as const;

type Cle = keyof typeof FICHIERS;
let memoire: Partial<Record<Cle, string>> = {};

function base64(bytes: Uint8Array): string {
  let binaire = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binaire += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binaire);
}

async function lire(chemin: string, origine: string): Promise<Uint8Array | null> {
  try {
    const assets = (getCloudflareContext().env as unknown as { ASSETS?: { fetch(r: Request): Promise<Response> } }).ASSETS;
    if (assets) {
      const r = await assets.fetch(new Request(new URL(chemin, origine)));
      if (r.ok) return new Uint8Array(await r.arrayBuffer());
    }
  } catch {
    // Pas de binding ASSETS (next dev) : on passe par l'origine.
  }
  try {
    const r = await fetch(new URL(chemin, origine));
    if (r.ok) return new Uint8Array(await r.arrayBuffer());
  } catch {
    // Fichier injoignable : le dossier s'en passe.
  }
  return null;
}

async function dataUrl(cle: Cle, origine: string): Promise<string | null> {
  if (memoire[cle]) return memoire[cle]!;
  const [chemin, type] = FICHIERS[cle];
  const bytes = await lire(chemin, origine);
  if (!bytes) return null;
  const url = `data:${type};base64,${base64(bytes)}`;
  memoire = { ...memoire, [cle]: url };
  return url;
}

export async function presentationDossierAssets(
  origine: string,
): Promise<Pick<PresentationDossierOptions, "images" | "fonts">> {
  const [mark, founder, f400, f500, f600, f700] = await Promise.all(
    (["mark", "founder", "f400", "f500", "f600", "f700"] as const).map((c) => dataUrl(c, origine)),
  );
  const fonts: NonNullable<PresentationDossierOptions["fonts"]> = [];
  ([[400, f400], [500, f500], [600, f600], [700, f700]] as const).forEach(([weight, src]) => {
    if (src) fonts.push({ weight, src });
  });
  return { images: { mark: mark ?? "", founder }, fonts };
}
