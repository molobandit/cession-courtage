import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicListingList } from "@/components/listing/public-listing-list";
import { INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";

export const metadata: Metadata = {
  title: "Annonces de portefeuilles de courtage",
  description:
    "Dossiers anonymes de portefeuilles de courtage à céder. Zone, commissions annuelles, nombre de contrats et fenêtre d’offres.",
  alternates: { canonical: "/annonces" },
};

export default async function PublicListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>;
}) {
  const { zone } = await searchParams;
  const cards = await loadPublicListingCards();

  const initialZone = zone?.trim() ?? "";

  return (
    <main>
      <section className="border-y border-line bg-paper text-ink">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            Petites annonces
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight">
            Portefeuilles à céder
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] text-muted">
            Toutes les fiches sont anonymes. Ni raison sociale, ni commune. L’identité
            du cédant n’est révélée qu’après dépôt de {INTEREST_DEPOSIT_LABEL} du prix demandé, simulé
            en démo.
          </p>
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Type d’annonce">
            <span className="rounded-full bg-indigo px-4 py-2 text-[15px] font-medium text-white">
              Portefeuilles à céder
            </span>
            <Link
              href="/annonces/demandes"
              className="rounded-full border border-line px-4 py-2 text-[15px] text-muted hover:border-indigo hover:text-indigo-dark"
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
            <Button asChild variant="primary" className="mt-6">
              <Link href="/acquerir">Déposer un mandat</Link>
            </Button>
          </div>
        ) : (
          <PublicListingList
            listings={cards}
            initialFilters={initialZone ? { zone: initialZone } : undefined}
          />
        )}
      </div>
    </main>
  );
}
