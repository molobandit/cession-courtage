import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PublicListingList,
  type PublicListingCard,
} from "@/components/listing/public-listing-list";
import { listPublicListingFacets, listPublicListings } from "@/lib/authz";
import { LISTING_STATUS_LABELS, RISK_TYPE_LABELS, SEGMENT_LABELS } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Annonces de portefeuilles de courtage",
  description:
    "Dossiers anonymes de portefeuilles de courtage à céder. Zone, commissions annuelles, nombre de contrats et fenêtre d’offres.",
  alternates: { canonical: "/annonces" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Jours restants, arrondis au jour entier. Calculé ici pour éviter tout écart client. */
function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}

export default async function PublicListingsPage() {
  const listings = await listPublicListings();
  const facets = await listPublicListingFacets(listings.map((l) => l.portfolioId));

  const cards: PublicListingCard[] = listings.map((item) => {
    const facet = facets.get(item.portfolioId) ?? {
      carriers: [],
      riskTypes: [],
      clientSegments: [],
    };
    return {
    id: item.id,
    publicNumber: item.publicNumber,
    status: item.status,
    statusLabel: LISTING_STATUS_LABELS[item.status],
    zone: item.displayedZone,
    askingPrice: Number(item.askingPrice),
    annualCommissions: Number(item.portfolio.annualCommissions),
    contractCount: item.portfolio.contractCount,
    averageAgeMonths: item.portfolio.averageAgeMonths,
    isPartial: item.isPartial,
    isNationwide: item.isNationwide,
    sellerSupportMonths: item.sellerSupportMonths,
    daysLeft: daysUntil(item.offerWindowClosesAt),
    carriers: facet.carriers,
    riskTypes: facet.riskTypes.map(
      (r) => RISK_TYPE_LABELS[r as keyof typeof RISK_TYPE_LABELS] ?? r,
    ),
    clientSegments: facet.clientSegments.map(
      (s) => SEGMENT_LABELS[s as keyof typeof SEGMENT_LABELS] ?? s,
    ),
    };
  });

  return (
    <main>
      <section className="bg-charcoal text-cream">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-soft">
            Dossiers en ligne
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight">
            Portefeuilles à céder
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] text-cream/80">
            Toutes les fiches sont anonymes. Ni raison sociale, ni commune. L’identité
            du cédant n’est révélée qu’à la signature de la lettre d’intention.
          </p>
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Type d’annonce">
            <span className="rounded-full bg-indigo px-4 py-2 text-[15px] font-medium text-white">
              Portefeuilles à céder
            </span>
            <Link
              href="/annonces/demandes"
              className="rounded-full border border-cream/25 px-4 py-2 text-[15px] text-cream/80 hover:border-gold/50 hover:text-indigo-soft"
            >
              Demandes d’acquisition
            </Link>
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {cards.length === 0 ? (
          <div className="rounded-3xl border border-line bg-paper p-8">
            <h2 className="font-serif text-xl font-semibold text-ink">
              Aucun dossier publié pour le moment
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
              Déposez un mandat d’achat : vous serez prévenu le matin de la mise en
              ligne d’un dossier correspondant à vos critères, et jamais plus d’une
              fois par jour.
            </p>
            <Button asChild variant="gold" className="mt-6">
              <Link href="/acquerir">Déposer un mandat</Link>
            </Button>
          </div>
        ) : (
          <PublicListingList listings={cards} />
        )}
      </div>
    </main>
  );
}
