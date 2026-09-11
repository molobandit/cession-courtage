import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/page-intro";
import { PublicListingList } from "@/components/listing/public-listing-list";
import { parseSearchPrefs, searchPrefsToFilters } from "@/lib/account/search-prefs";
import { canBuy, getActor, isOriasVerified } from "@/lib/authz";
import { MARKET_HALL_TITLE } from "@/lib/copy/market";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: MARKET_HALL_TITLE,
  description:
    "Salle de marché : portefeuilles d’assurance disponibles à l’achat ou à la cession.",
  alternates: { canonical: "/annonces" },
};

export default async function PublicListingsPage() {
  const cards = await loadPublicListingCards();
  const actor = await getActor();
  const mandateHref =
    actor && isOriasVerified(actor) && canBuy(actor) ? "/app/mandats" : "/acquerir";
  const showDetailedFilters = Boolean(actor);
  let initialFilters = {};
  if (actor) {
    const row = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { searchPrefs: true },
    });
    initialFilters = searchPrefsToFilters(parseSearchPrefs(row?.searchPrefs));
  }

  return (
    <main>
      <PageIntro title={MARKET_HALL_TITLE}>
        Portefeuilles disponibles. Les filtres détaillés (zone, branches, budget)
        se règlent dans le compte, puis s’appliquent ici une fois connecté.
      </PageIntro>
      <div className="mx-auto max-w-6xl px-4 py-8">
          <nav className="flex flex-wrap gap-2" aria-label="Type de dossier">
            <span className="rounded-full bg-indigo px-4 py-2 text-[14px] font-medium text-white">
              Portefeuilles à céder
            </span>
            <Link
              href="/annonces/demandes"
              className="rounded-full border border-line px-4 py-2 text-[14px] text-muted hover:border-indigo hover:text-indigo"
            >
              Demandes d’acquisition
            </Link>
          </nav>
        {cards.length === 0 ? (
          <div className="rounded-xl border border-line bg-paper p-8">
            <h2 className="text-xl font-semibold text-ink">
              Aucun portefeuille publié pour le moment
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
              Déposez un mandat d’achat pour être prévenu dès qu’un dossier
              correspondant est mis en ligne.
            </p>
            <Button asChild variant="primary" className="mt-6">
              <Link href={mandateHref}>Déposer un mandat</Link>
            </Button>
          </div>
        ) : (
          <PublicListingList
            listings={cards}
            initialFilters={initialFilters}
            showDetailedFilters={showDetailedFilters}
            accountHref={actor ? "/app/profil#recherche" : "/connexion?next=/annonces"}
          />
        )}
      </div>
    </main>
  );
}
