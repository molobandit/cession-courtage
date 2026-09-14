import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OfferReviewBoard } from "@/components/offer/offer-review-board";
import { getActor, isOriasVerified, listOffersForListing } from "@/lib/authz";
import { ForbiddenError } from "@/lib/authz/errors";
import { isOfferWindowSealed, ownsFirm } from "@/lib/authz/policies";
import { listListingPositions } from "@/lib/position/load";
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

  // Retenir une offre attend la clôture de la séance ; la voir, non.
  const canRetain = ownsFirm(actor, listing.portfolio.firmId) && result.access === "full" && !isOfferWindowSealed(listing);
  const candidats = ownsFirm(actor, listing.portfolio.firmId) ? await listListingPositions(listing.id) : [];

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
    >
    {candidats.length > 0 ? (
      <section className="mt-6">
        {/*
         * Chaque candidat a son dossier, du premier contact à la clôture. Le
         * cédant y lit l'avancement et y répond, sans mélanger les fils.
         */}
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h2 className="text-[18px] font-semibold text-ink">
            Candidats <span className="tabular text-muted">{candidats.length}</span>
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {candidats.map(({ position, state }) => (
              <li key={position.id}>
                <Link
                  href={`/app/positions/${position.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 hover:border-indigo"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">Acquéreur {position.buyer.publicAlias}</span>
                    <span className="block truncate text-[13px] text-muted">{state.title}</span>
                  </span>
                  <span className="tabular shrink-0 text-[14px] font-bold text-indigo-dark">{state.percent}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    ) : null}
    </OfferReviewBoard>
  );
}
