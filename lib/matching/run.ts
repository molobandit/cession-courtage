import "server-only";
import { MatchStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { displayedZoneFor } from "@/lib/geo";
import { profileFromLinesWithClients } from "@/lib/listing/profile";
import { scoreListingAgainstMandate } from "@/lib/matching/score";
import { sendMail } from "@/lib/integrations/mailer";

export async function loadListingMatchInput(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
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
    },
  });
  if (!listing) return null;

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
  const zone = displayedZoneFor(listing.departments.length ? listing.departments : profile.departments);
  return {
    listing,
    profile: {
      ...profile,
      askingPrice: Number(listing.askingPrice),
      regionCodes: listing.regions,
      isNationwide: listing.isNationwide || zone.isNationwide,
    },
  };
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
      riskTypes: mandate.riskTypes,
      carriers: mandate.carriers,
      zones: mandate.zones,
      clientSegments: mandate.clientSegments,
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

export async function rematchMandate(mandateId: string): Promise<number> {
  const mandate = await prisma.buyerMandate.findUnique({
    where: { id: mandateId },
    include: { buyer: { select: { email: true } } },
  });
  if (!mandate || !mandate.isActive) return 0;

  const listings = await prisma.listing.findMany({
    where: { status: { in: ["PUBLISHED", "OFFERS_OPEN"] } },
    select: { id: true },
  });
  let created = 0;
  for (const listing of listings) {
    const loaded = await loadListingMatchInput(listing.id);
    if (!loaded) continue;
    const result = scoreListingAgainstMandate(loaded.profile, {
      maxBudget: Number(mandate.maxBudget),
      minCommissions: Number(mandate.minCommissions),
      maxCommissions: Number(mandate.maxCommissions),
      riskTypes: mandate.riskTypes,
      carriers: mandate.carriers,
      zones: mandate.zones,
      clientSegments: mandate.clientSegments,
    });
    if (result.score < 40) continue;
    const existing = await prisma.match.findUnique({
      where: { listingId_mandateId: { listingId: listing.id, mandateId } },
    });
    if (existing) {
      await prisma.match.update({
        where: { id: existing.id },
        data: { score: result.score, criteriaBreakdown: result.criteriaBreakdown },
      });
      continue;
    }
    await prisma.match.create({
      data: {
        listingId: listing.id,
        mandateId,
        score: result.score,
        criteriaBreakdown: result.criteriaBreakdown,
        status: MatchStatus.SUGGESTED,
        notifiedAt: new Date(),
      },
    });
    created += 1;
  }
  return created;
}
