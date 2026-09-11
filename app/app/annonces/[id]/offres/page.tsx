import { notFound, redirect } from "next/navigation";
import { OfferReviewBoard } from "@/components/offer/offer-review-board";
import { getActor, isOriasVerified, listOffersForListing } from "@/lib/authz";
import { ForbiddenError } from "@/lib/authz/errors";
import { ownsFirm } from "@/lib/authz/policies";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Offres" };

export default async function ListingOffersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      publicNumber: true,
      askingPrice: true,
      displayedZone: true,
      status: true,
      offerWindowClosesAt: true,
      portfolio: { select: { annualCommissions: true, firmId: true } },
    },
  });
  if (!listing) notFound();

  let result: Awaited<ReturnType<typeof listOffersForListing>>;
  try {
    result = await listOffersForListing(id, actor);
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const canRetain = ownsFirm(actor, listing.portfolio.firmId) && result.access === "full";

  return (
    <OfferReviewBoard
      listing={{
        id: listing.id,
        publicNumber: listing.publicNumber,
        askingPrice: Number(listing.askingPrice),
        displayedZone: listing.displayedZone,
        status: listing.status,
        offerWindowClosesAt: listing.offerWindowClosesAt,
        annualCommissions: Number(listing.portfolio.annualCommissions),
      }}
      offers={result.offers.map((offer) => ({
        id: offer.id,
        amount: Number(offer.amount),
        upfrontPercent: Number(offer.upfrontPercent),
        message: offer.message,
        status: offer.status,
        submittedAt: offer.submittedAt,
        buyer: { publicAlias: offer.buyer.publicAlias },
      }))}
      access={result.access}
      canRetain={canRetain}
    />
  );
}
