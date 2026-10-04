import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import puppeteer from "@cloudflare/puppeteer";

/**
 * Impression du dossier de présentation en PDF.
 *
 * Le HTML de lib/listing/presentation-dossier est imprimé par le navigateur
 * de Cloudflare (Browser Rendering, binding BROWSER). Chaque PDF est rangé
 * dans R2 sous l'empreinte de son HTML : une même copie, pour un même
 * destinataire et un même jour, n'est imprimée qu'une fois.
 *
 * Renvoie null si le navigateur n'est pas disponible (binding absent ou
 * quota du jour atteint) : la route sert alors l'ancien dossier.
 */

type Bucket = {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
};

type Env = { BROWSER?: unknown; UPLOADS?: Bucket };

function env(): Env {
  try {
    return getCloudflareContext().env as unknown as Env;
  } catch {
    return {};
  }
}

async function empreinte(html: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(html));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function printPresentationDossier(
  html: string,
  publicNumber: number | null,
  famille: "dossiers" | "cabinets" = "dossiers",
): Promise<Uint8Array | null> {
  const { BROWSER, UPLOADS } = env();
  const key = `${famille}/${publicNumber ?? "estimation"}/${await empreinte(html)}.pdf`;

  if (UPLOADS) {
    try {
      const deja = await UPLOADS.get(key);
      if (deja) return new Uint8Array(await deja.arrayBuffer());
    } catch {
      // Lecture du cache impossible : on imprime.
    }
  }
  if (!BROWSER) return null;

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch(BROWSER as Parameters<typeof puppeteer.launch>[0]);
    const page = await browser.newPage();
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
  } catch (error) {
    console.error("presentation-dossier: impression impossible", error);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}
