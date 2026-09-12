import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/listing/chips";
import { canBuy, getActor, getPublicMandateByNumber, isOriasVerified } from "@/lib/authz";
import { formatEuroWhole } from "@/lib/format/number";
import { mapPublicMandateCard } from "@/lib/mandate/map-public";
import { acquisitionRequestHref } from "@/lib/nav/acquisition";

type PageProps = { params: Promise<{ numero: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const numero = Number((await params).numero);
  if (!Number.isInteger(numero)) return { title: "Demande d’acquisition" };
  return { title: `Demande n° ${numero}` };
}

export default async function PublicMandateDetailPage({ params }: PageProps) {
  const numero = Number((await params).numero);
  const row = Number.isInteger(numero) ? await getPublicMandateByNumber(numero) : null;
  const mandate = row ? mapPublicMandateCard(row) : null;
  if (!mandate) notFound();

  const actor = await getActor();
  const depositHref = acquisitionRequestHref({
    loggedIn: Boolean(actor),
    canBuy: Boolean(actor && isOriasVerified(actor) && canBuy(actor)),
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/annonces/demandes" className="text-[14px] font-medium text-muted hover:text-ink">
        Retour aux demandes
      </Link>
      <p className="mt-6 text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
        Recherche à acquérir
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold text-ink">
        Demande n° {mandate.publicNumber}
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        Acquéreur {mandate.buyerAlias}
        {mandate.isNationwide ? " · couverture nationale" : ""}
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 rounded-[1.75rem] border border-line bg-paper p-6">
        <div>
          <dt className="text-sm text-muted">Budget maximum</dt>
          <dd className="tabular mt-1 text-2xl font-bold text-ink">{formatEuroWhole(mandate.maxBudget)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Commissions recherchées</dt>
          <dd className="tabular mt-1 text-2xl font-bold text-ink">
            {formatEuroWhole(mandate.minCommissions)} à {formatEuroWhole(mandate.maxCommissions)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-sm text-muted">Financement</dt>
          <dd className="mt-1 text-[15px] font-medium text-ink">{mandate.financingLabel}</dd>
        </div>
      </dl>

      <div className="mt-6 space-y-4 rounded-[1.75rem] border border-line bg-paper p-6">
        <ChipGroup label="Branches recherchées" items={mandate.riskTypes} />
        <ChipGroup label="Clientèles" items={mandate.clientSegments} />
        {mandate.isNationwide ? (
          <p className="text-[14px] text-muted">Couverture nationale</p>
        ) : (
          <ChipGroup label="Zones" items={mandate.zones} />
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="primary">
          <Link href="/annonces">Voir les portefeuilles à céder</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={depositHref}>Déposer ma demande d’acquisition</Link>
        </Button>
      </div>
    </main>
  );
}
