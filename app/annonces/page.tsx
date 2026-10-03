import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/page-intro";
import { PublicListingList } from "@/components/listing/public-listing-list";
import { parseSearchPrefs, searchPrefsToFilters } from "@/lib/account/search-prefs";
import { canBuy, getActor, isOriasVerified } from "@/lib/authz";
import { MARKET_HALL, MARKET_HALL_LEDE } from "@/lib/copy/market";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: MARKET_HALL,
  description:
    "Salle de marché : portefeuilles d’assurance disponibles à l’achat ou à la cession.",
  alternates: { canonical: "/annonces" },
};

export default async function PublicListingsPage() {
  const cards = await loadPublicListingCards();
  const actor = await getActor();
  const contactHref =
    actor && isOriasVerified(actor) && canBuy(actor) ? "/app/profil#recherche" : "/acquerir";
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
      <PageIntro title={MARKET_HALL}>{MARKET_HALL_LEDE}</PageIntro>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {cards.length === 0 ? (
          <div className="rounded-xl border border-line bg-paper p-8">
            <h2 className="text-xl font-semibold text-ink">
              Aucun portefeuille en ligne pour le moment
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
              Chaque portefeuille est étudié et chiffré avant sa mise en ligne. Dites-nous ce que vous
              cherchez : nous vous prévenons dès qu’un dossier y correspond.
            </p>
            <Button asChild variant="primary" className="mt-6">
              <Link href={contactHref}>Être prévenu des mises en ligne</Link>
            </Button>
          </div>
        ) : (
          <PublicListingList
            listings={cards}
            initialSort="recent"
            initialFilters={initialFilters}
            showDetailedFilters={showDetailedFilters}
            accountHref={actor ? "/app/profil#recherche" : "/connexion?next=/annonces"}
          />
        )}
      </div>
    </main>
  );
}
