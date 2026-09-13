import "server-only";
import { MatchStatus, NotificationType, type ClientSegment, type RiskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { displayedZoneFor } from "@/lib/geo";
import { asStringArray } from "@/lib/json-array";
import { profileFromLinesWithClients } from "@/lib/listing/profile";
import { scoreListingAgainstMandate } from "@/lib/matching/score";
import { sendMail } from "@/lib/integrations/mailer";

const MATCH_LISTING_INCLUDE = {
  portfolio: {
    include: {
      contractLines: {
        select: {
          id: true,
          riskType: true,
          carrier: true,
          clientSegment: true,
          department: true,
          annualCommission: true,
          clientKey: true,
        },
      },
    },
  },
  lines: { select: { contractLineId: true } },
} as const;

type MatchListing = Awaited<
  ReturnType<typeof prisma.listing.findFirstOrThrow<{ include: typeof MATCH_LISTING_INCLUDE }>>
>;

function matchInputFor(listing: MatchListing) {
  let lines = listing.portfolio.contractLines;
  if (listing.isPartial && listing.lines.length > 0) {
    const allowed = new Set(listing.lines.map((l) => l.contractLineId));
    lines = lines.filter((l) => allowed.has(l.id));
  }
  const profile = profileFromLinesWithClients(
    lines.map((l) => ({
      ...l,
      annualCommission: Number(l.annualCommission),
    })),
  );
  const listingDepartments = asStringArray(listing.departments);
  const zone = displayedZoneFor(listingDepartments.length ? listingDepartments : profile.departments);
  return {
    listing,
    profile: {
      ...profile,
      askingPrice: Number(listing.askingPrice),
      regionCodes: asStringArray(listing.regions),
      isNationwide: listing.isNationwide || zone.isNationwide,
    },
  };
}

export async function loadListingMatchInput(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: MATCH_LISTING_INCLUDE,
  });
  return listing ? matchInputFor(listing) : null;
}

export async function rematchListing(listingId: string): Promise<number> {
  const loaded = await loadListingMatchInput(listingId);
  if (!loaded) return 0;
  const mandates = await prisma.buyerMandate.findMany({
    where: { isActive: true },
    include: { buyer: { select: { id: true, email: true } } },
  });

  let created = 0;
  for (const mandate of mandates) {
    const result = scoreListingAgainstMandate(loaded.profile, {
      maxBudget: Number(mandate.maxBudget),
      minCommissions: Number(mandate.minCommissions),
      maxCommissions: Number(mandate.maxCommissions),
      riskTypes: asStringArray(mandate.riskTypes) as RiskType[],
      carriers: asStringArray(mandate.carriers),
      zones: asStringArray(mandate.zones),
      clientSegments: asStringArray(mandate.clientSegments) as ClientSegment[],
    });
    if (result.score < 40) continue;

    const existing = await prisma.match.findUnique({
      where: { listingId_mandateId: { listingId, mandateId: mandate.id } },
    });
    if (existing) {
      await prisma.match.update({
        where: { id: existing.id },
        data: { score: result.score, criteriaBreakdown: result.criteriaBreakdown },
      });
      continue;
    }

    const match = await prisma.match.create({
      data: {
        listingId,
        mandateId: mandate.id,
        score: result.score,
        criteriaBreakdown: result.criteriaBreakdown,
        status: MatchStatus.SUGGESTED,
        notifiedAt: new Date(),
      },
    });
    created += 1;
    if (mandate.alertsEnabled) {
      await prisma.notification.create({
        data: {
          userId: mandate.buyerId,
          type: NotificationType.MATCH,
          title: "Nouvelle correspondance de portefeuille",
          body: `Une annonce correspond à votre mandat (score ${result.score}/100).`,
          href: `/annonces/${loaded.listing.publicNumber}`,
          matchId: match.id,
        },
      });
      await sendMail({
        to: mandate.buyer.email,
        subject: "Correspondance de portefeuille",
        bodyText: `Une annonce anonyme correspond à votre mandat de recherche (score ${result.score}/100).\nDossier #${loaded.listing.publicNumber}`,
        purpose: "MATCH",
      });
    }
  }
  return created;
}

/**
 * Correspondances d'une demande, recalculées d'un bloc.
 *
 * Une requête par annonce faisait plusieurs centaines d'appels à la base pour
 * un seul formulaire : sur Workers, la limite d'appels par requête tombait
 * avant la fin, et la demande d'acquisition semblait ne rien faire. Tout est
 * désormais chargé en une fois, noté en mémoire, puis écrit en lot.
 */
export async function rematchMandate(mandateId: string): Promise<number> {
  const mandate = await prisma.buyerMandate.findUnique({
    where: { id: mandateId },
    include: { buyer: { select: { email: true } } },
  });
  if (!mandate || !mandate.isActive) return 0;

  const [listings, existants] = await Promise.all([
    // Mêmes annonces que celles qui reçoivent encore des offres : une
    // correspondance vers une annonce fermée mènerait l'acquéreur dans une impasse.
    prisma.listing.findMany({
      where: { status: { in: ["PUBLISHED", "OFFERS_OPEN", "OFFERS_CLOSED"] } },
      include: MATCH_LISTING_INCLUDE,
    }),
    prisma.match.findMany({ where: { mandateId }, select: { id: true, listingId: true } }),
  ]);
  const dejaLa = new Map(existants.map((m) => [m.listingId, m.id]));
  const criteres = {
    maxBudget: Number(mandate.maxBudget),
    minCommissions: Number(mandate.minCommissions),
    maxCommissions: Number(mandate.maxCommissions),
    riskTypes: asStringArray(mandate.riskTypes) as RiskType[],
    carriers: asStringArray(mandate.carriers),
    zones: asStringArray(mandate.zones),
    clientSegments: asStringArray(mandate.clientSegments) as ClientSegment[],
  };

  const nouveaux: { listingId: string; score: number; criteriaBreakdown: object }[] = [];
  for (const listing of listings) {
    const result = scoreListingAgainstMandate(matchInputFor(listing).profile, criteres);
    if (result.score < 40) continue;
    const existant = dejaLa.get(listing.id);
    if (existant) {
      await prisma.match.update({
        where: { id: existant },
        data: { score: result.score, criteriaBreakdown: result.criteriaBreakdown },
      });
      continue;
    }
    nouveaux.push({ listingId: listing.id, score: result.score, criteriaBreakdown: result.criteriaBreakdown });
  }

  if (nouveaux.length > 0) {
    const maintenant = new Date();
    await prisma.match.createMany({
      data: nouveaux.map((n) => ({
        listingId: n.listingId,
        mandateId,
        score: n.score,
        criteriaBreakdown: n.criteriaBreakdown,
        status: MatchStatus.SUGGESTED,
        notifiedAt: maintenant,
      })),
    });
  }
  return nouveaux.length;
}
