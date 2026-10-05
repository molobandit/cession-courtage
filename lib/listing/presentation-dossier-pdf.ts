import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import puppeteer from "@cloudflare/puppeteer";

/**
 * Impression du dossier de présentation en PDF.
 *
 * Le HTML de lib/listing/presentation-dossier est imprimé par le navigateur
 * de Cloudflare (Browser Rendering, binding BROWSER). Chaque PDF est rangé
 * dans R2 sous l'empreinte de son HTML : une même copie, pour un même
 * destinataire, n'est imprimée qu'une fois.
 *
 * Renvoie null si le navigateur n'est pas disponible (binding absent, quota
 * du jour atteint, impression trop longue) : la route sert alors l'ancien
 * dossier, imprimé sur place, plutôt que de faire attendre.
 */

type Bucket = {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
};

type Env = { BROWSER?: unknown; UPLOADS?: Bucket };

/** Au delà, on rend la main : l'ancien dossier vaut mieux qu'un écran noir. */
const DELAI_MS = 8_000;
/** Le navigateur d'impression reste chaud : la fois suivante n'attend pas son démarrage. */
const GARDE_MS = 600_000;

function env(): Env {
  try {
    return getCloudflareContext().env as unknown as Env;
  } catch {
    return {};
  }
}

/**
 * Détache un travail de la requête qui l'a lancé.
 *
 * Le lecteur PDF du navigateur abandonne sa première requête puis la rejoue.
 * Sans ce détachement, l'impression commencée par la requête abandonnée
 * mourait avec elle, et la requête suivante attendait une promesse qui ne se
 * résolvait jamais : vingt secondes d'écran noir. waitUntil la laisse finir.
 */
function detacher(travail: Promise<unknown>): void {
  try {
    getCloudflareContext().ctx.waitUntil(travail.catch(() => undefined));
  } catch {
    // Hors contexte Cloudflare (tests, next dev) : le travail vit avec la requête.
  }
}

async function empreinte(html: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(html));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cle(publicNumber: number | null, famille: "dossiers" | "cabinets", hash: string): string {
  return `${famille}/${publicNumber ?? "estimation"}/${hash}.pdf`;
}

async function lireCache(key: string): Promise<Uint8Array | null> {
  const { UPLOADS } = env();
  if (!UPLOADS) return null;
  try {
    const objet = await UPLOADS.get(key);
    return objet ? new Uint8Array(await objet.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Les impressions en cours, par clé : deux requêtes pour un même fichier n'en lancent qu'une. */
const enCours = new Map<string, Promise<Uint8Array | null>>();

function demarrer(html: string, key: string): Promise<Uint8Array | null> {
  const deja = enCours.get(key);
  if (deja) return deja;
  const travail = imprimer(html, key).finally(() => enCours.delete(key));
  enCours.set(key, travail);
  detacher(travail);
  return travail;
}

function avecDelai(travail: Promise<Uint8Array | null>, ms: number): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const minuteur = setTimeout(() => resolve(null), ms);
    travail
      .then((pdf) => {
        clearTimeout(minuteur);
        resolve(pdf);
      })
      .catch(() => {
        clearTimeout(minuteur);
        resolve(null);
      });
  });
}

export async function printPresentationDossier(
  html: string,
  publicNumber: number | null,
  famille: "dossiers" | "cabinets" = "dossiers",
): Promise<Uint8Array | null> {
  const key = cle(publicNumber, famille, await empreinte(html));
  // Le cache d'abord, toujours : une copie déjà rangée ne doit attendre aucune impression.
  const deja = await lireCache(key);
  if (deja) return deja;
  return avecDelai(demarrer(html, key), DELAI_MS);
}

/**
 * Imprime à l'avance, sans faire attendre personne.
 *
 * Appelé quand un dépôt est reçu ou qu'une annonce est publiée : le fichier
 * est rangé dans R2 avant le premier clic, et l'ouverture ne coûte plus que
 * sa lecture.
 */
export function warmPresentationDossier(
  html: string,
  publicNumber: number | null,
  famille: "dossiers" | "cabinets" = "dossiers",
): void {
  const travail = (async () => {
    const key = cle(publicNumber, famille, await empreinte(html));
    if (await lireCache(key)) return null;
    return demarrer(html, key);
  })();
  detacher(travail);
}

/**
 * Un navigateur d'impression, repris s'il en reste un de chaud.
 *
 * Démarrer un navigateur coûte une à deux secondes. Browser Rendering garde
 * les sessions ouvertes pendant `keep_alive` : on se raccroche à une session
 * libre quand il y en a une, et on se contente de se détacher à la fin pour
 * que la suivante en profite.
 */
async function navigateur(BROWSER: unknown) {
  try {
    const sessions = await puppeteer.sessions(BROWSER as Parameters<typeof puppeteer.sessions>[0]);
    for (const session of sessions) {
      if (session.connectionId) continue;
      try {
        return await puppeteer.connect(BROWSER as Parameters<typeof puppeteer.connect>[0], session.sessionId);
      } catch {
        // Session prise entre temps : on essaie la suivante.
      }
    }
  } catch {
    // Pas de liste de sessions : on démarre.
  }
  return puppeteer.launch(BROWSER as Parameters<typeof puppeteer.launch>[0], { keep_alive: GARDE_MS });
}

async function imprimer(html: string, key: string): Promise<Uint8Array | null> {
  const { BROWSER, UPLOADS } = env();
  if (!BROWSER) return null;

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await navigateur(BROWSER);
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready.then(() => true));
      const pdf = new Uint8Array(
        await page.pdf({ width: "1280px", height: "720px", printBackground: true, preferCSSPageSize: true }),
      );
      if (UPLOADS) {
        try {
          await UPLOADS.put(key, pdf, { httpMetadata: { contentType: "application/pdf" } });
        } catch {
          // Le cache est un confort : le dossier part quand même.
        }
      }
      return pdf;
    } finally {
      await page.close().catch(() => undefined);
    }
  } catch (error) {
    console.error("presentation-dossier: impression impossible", error);
    return null;
  } finally {
    // Se détacher, pas fermer : la session reste chaude pour l'impression suivante.
    if (browser) {
      try {
        browser.disconnect();
      } catch {
        await browser.close().catch(() => undefined);
      }
    }
  }
}
