import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/page-intro";
import { PublicListingList } from "@/components/listing/public-listing-list";
import { GROWTH_PLAN_ANNUAL_EUR, INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import { canBuy, getActor, isOriasVerified } from "@/lib/authz";

export const metadata: Metadata = {
  title: "Annonces de portefeuilles de courtage",
  description:
    "Dossiers anonymes de portefeuilles de courtage à céder. Zone, commissions annuelles, nombre de contrats et fenêtre d’offres.",
  alternates: { canonical: "/annonces" },
};

export default async function PublicListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string; q?: string }>;
}) {
  const { zone, q } = await searchParams;
  const cards = await loadPublicListingCards();
  const actor = await getActor();
  const mandateHref =
    actor && isOriasVerified(actor) && canBuy(actor) ? "/app/mandats" : "/acquerir";

  const initialZone = zone?.trim() ?? "";
  const initialQuery = q?.trim() ?? "";

  return (
    <main>
      <PageIntro title="Portefeuilles à céder">
        Toutes les fiches sont anonymes. Ni raison sociale, ni commune. Un
        abonnement de {GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")} € HT par
        an ouvre le détail de l’offre. Le vendeur reste anonyme jusqu’au dépôt
        de {INTEREST_DEPOSIT_LABEL} du prix.
      </PageIntro>
      <div className="mx-auto max-w-6xl px-4 py-8">
          <nav className="flex flex-wrap gap-2" aria-label="Type d’annonce">
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
              Aucun dossier publié pour le moment
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
              Déposez un mandat d’achat : vous serez prévenu le matin de la mise en
              ligne d’un dossier correspondant à vos critères, et jamais plus d’une
              fois par jour.
            </p>
            <Button asChild variant="primary" className="mt-6">
              <Link href={mandateHref}>Déposer un mandat</Link>
            </Button>
          </div>
        ) : (
          <PublicListingList
            listings={cards}
            initialFilters={{
              ...(initialZone ? { zone: initialZone } : {}),
              ...(initialQuery ? { q: initialQuery } : {}),
            }}
          />
        )}
      </div>
    </main>
  );
}
