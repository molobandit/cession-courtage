import "server-only";
import { prisma } from "@/lib/prisma";
import { loadValuationStudy } from "@/lib/listing/valuation-study";
import { buildPresentationDossierHtml } from "@/lib/listing/presentation-dossier";
import { presentationDossierAssets } from "@/lib/listing/presentation-dossier-assets";
import { loadCompanyPresentation } from "@/lib/listing/company-presentation";
import { buildCompanyPresentationHtml } from "@/lib/listing/company-presentation-html";
import { warmPresentationDossier } from "@/lib/listing/presentation-dossier-pdf";

/**
 * Imprimer avant le premier clic.
 *
 * Imprimer un dossier prend quelques secondes ; les lire prend le temps d'une
 * lecture dans R2. On sait d'avance qui ouvrira quoi : l'acquéreur dont le
 * dépôt vient d'être reçu ouvrira la présentation du cabinet et le dossier de
 * présentation, et une annonce qui vient d'être publiée sera lue par des
 * visiteurs. Ces deux moments lancent l'impression en arrière plan, sans
 * retenir la requête qui les déclenche.
 *
 * Chaque échec reste silencieux : rien ici n'est nécessaire au parcours, le
 * dossier s'imprime à la demande si la préimpression n'a pas abouti.
 */

type Destinataire = { label: string; date: Date } | null;

/** Le dossier de présentation de l'annonce, dans la copie d'un destinataire donné. */
export async function warmDossierPresentation(input: {
  listingId: string;
  origin: string;
  recipient: Destinataire;
}): Promise<void> {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: input.listingId },
      select: {
        id: true,
        publicNumber: true,
        portfolioId: true,
        askingPrice: true,
        certificationStatus: true,
      },
    });
    if (!listing) return;
    const study = await loadValuationStudy({ portfolioId: listing.portfolioId, listingId: listing.id });
    if (!study) return;
    const html = buildPresentationDossierHtml(study, {
      certified: listing.certificationStatus === "CERTIFIED",
      askingPrice: Number(listing.askingPrice),
      recipient: input.recipient,
      listingUrl: `${input.origin}/annonces/${listing.publicNumber}`,
      ...(await presentationDossierAssets(input.origin)),
    });
    warmPresentationDossier(html, listing.publicNumber, "dossiers");
  } catch (error) {
    console.error("dossier-warmup: dossier de présentation", error);
  }
}

/** La présentation du cabinet, qui n'existe que pour un acquéreur positionné. */
export async function warmCompanyPresentation(input: {
  listingId: string;
  publicNumber: number;
  origin: string;
  recipient: Destinataire;
}): Promise<void> {
  try {
    const presentation = await loadCompanyPresentation(input.listingId);
    if (!presentation) return;
    const html = buildCompanyPresentationHtml(presentation, {
      recipient: input.recipient,
      ...(await presentationDossierAssets(input.origin)),
    });
    warmPresentationDossier(html, input.publicNumber, "cabinets");
  } catch (error) {
    console.error("dossier-warmup: présentation du cabinet", error);
  }
}

/**
 * Les deux dossiers que lira l'acquéreur dont le dépôt vient d'être reçu.
 *
 * Sa copie porte son pseudonyme et la date de son positionnement : exactement
 * celle que les routes reconstruiront quand il cliquera.
 */
export async function warmForPositionedBuyer(input: {
  listingId: string;
  publicNumber: number;
  publicAlias: string;
  placedAt: Date;
  origin: string;
}): Promise<void> {
  const recipient = { label: `l'acquéreur ${input.publicAlias}`, date: input.placedAt };
  await Promise.all([
    warmCompanyPresentation({
      listingId: input.listingId,
      publicNumber: input.publicNumber,
      origin: input.origin,
      recipient,
    }),
    warmDossierPresentation({ listingId: input.listingId, origin: input.origin, recipient }),
  ]);
}

/**
 * Point d'entrée des deux parcours : un dépôt vient d'être reçu.
 *
 * Retrouve le pseudonyme et la date du positionnement, puis lance les deux
 * impressions. L'appelant n'attend pas : tout se passe en arrière plan, et
 * l'échec éventuel ne remonte pas jusqu'à lui.
 */
export async function warmAfterPositioning(input: {
  listingId: string;
  userId: string;
  investor: boolean;
}): Promise<void> {
  try {
    const { siteUrl } = await import("@/lib/site");
    const [listing, user, date] = await Promise.all([
      prisma.listing.findUnique({ where: { id: input.listingId }, select: { publicNumber: true } }),
      prisma.user.findUnique({ where: { id: input.userId }, select: { publicAlias: true } }),
      (async () => {
        const { positioningDate } = await import("@/lib/listing/company-docs");
        return positioningDate(input.listingId, input.userId, input.investor);
      })(),
    ]);
    if (!listing?.publicNumber || !user?.publicAlias) return;
    await warmForPositionedBuyer({
      listingId: input.listingId,
      publicNumber: listing.publicNumber,
      publicAlias: user.publicAlias,
      placedAt: date ?? new Date(),
      origin: siteUrl(),
    });
  } catch (error) {
    console.error("dossier-warmup: après positionnement", error);
  }
}

/**
 * La copie que lisent les visiteurs, imprimée dès la publication.
 *
 * Un visiteur non connecté lit un dossier sans mention de remise : une seule
 * copie pour tout le monde, donc une seule impression, qu'on fait tout de
 * suite plutôt qu'au premier clic. Sans effet sur un brouillon, que personne
 * ne peut encore ouvrir.
 */
export async function warmVisitorDossier(listingId: string): Promise<void> {
  try {
    const { siteUrl } = await import("@/lib/site");
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { publishedAt: true },
    });
    if (!listing?.publishedAt) return;
    await warmDossierPresentation({ listingId, origin: siteUrl(), recipient: null });
  } catch (error) {
    console.error("dossier-warmup: copie visiteur", error);
  }
}
