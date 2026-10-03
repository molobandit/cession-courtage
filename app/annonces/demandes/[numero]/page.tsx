import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/listing/chips";
import { ProposeListingForm } from "@/components/mandate/propose-listing-form";
import { canBuy, canSell, getActor, getPublicMandateByNumber, isOriasVerified } from "@/lib/authz";
import { formatEuroWhole } from "@/lib/format/number";
import { LISTING_STATUS_LABELS } from "@/lib/labels";
import { commissionsCedees, listingLotTotals } from "@/lib/listing/lot-totals";
import {
  listMatchesForMandate,
  listMyProposalsOnMandate,
  listProposableListings,
  listProposalsForMandate,
} from "@/lib/mandate/proposals";
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

  /*
   * La même demande ne se lit pas pareil selon qui la regarde. Son auteur veut
   * savoir ce qu'elle a produit : propositions reçues, portefeuilles
   * correspondants. Un cédant veut pouvoir y répondre. Les autres la consultent.
   */
  const verifie = Boolean(actor && isOriasVerified(actor));
  const estAuteur = Boolean(actor && row && row.buyerId === actor.id);
  const estCedant = Boolean(actor && verifie && !estAuteur && canSell(actor));

  const [propositions, correspondances] = estAuteur
    ? await Promise.all([listProposalsForMandate(mandate.id), listMatchesForMandate(mandate.id)])
    : [[], []];
  const [annoncesProposables, dejaProposees] =
    estCedant && actor
      ? await Promise.all([
          listProposableListings(actor.firmId),
          listMyProposalsOnMandate(mandate.id, actor.id),
        ])
      : [[], []];
  const proposees = new Set(dejaProposees.map((p) => p.listingId));
  const lots = await listingLotTotals(propositions.filter((p) => p.listing.isPartial).map((p) => p.listing.id));

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

      {estAuteur ? (
        <>
          <section className="mt-8 rounded-[1.75rem] border border-ok/30 bg-ok/10 p-6">
            <h2 className="text-xl font-semibold text-ink">Votre demande est publiée</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Elle apparaît au catalogue sous votre alias. Les cédants dont le portefeuille
              correspond peuvent vous le proposer : vous êtes prévenu à chaque proposition.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild variant="primary">
                <Link href="/app/mandats">Gérer mes demandes</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/annonces">Parcourir les portefeuilles</Link>
              </Button>
            </div>
          </section>

          <section className="mt-6 rounded-[1.75rem] border border-line bg-paper p-6">
            <h2 className="text-xl font-semibold text-ink">
              Propositions reçues <span className="tabular text-muted">{propositions.length}</span>
            </h2>
            {propositions.length === 0 ? (
              <p className="mt-2 text-[15px] text-muted">
                Aucune proposition pour le moment. En attendant, les portefeuilles
                correspondants sont listés ci-dessous.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {propositions.map((p) => (
                  <li key={p.id} className="rounded-2xl border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          Portefeuille n° {p.listing.publicNumber} · cédant {p.seller.publicAlias}
                        </p>
                        <p className="mt-0.5 text-[14px] text-muted">
                          {p.listing.displayedZone} · {formatEuroWhole(commissionsCedees(p.listing, lots))} de commissions / an ·{" "}
                          {LISTING_STATUS_LABELS[p.listing.status]}
                        </p>
                        {p.message ? (
                          <p className="mt-2 text-[14px] italic text-ink">« {p.message} »</p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="tabular text-lg font-bold text-ink">
                          {formatEuroWhole(Number(p.listing.askingPrice))}
                        </p>
                        <Button asChild variant="primary" size="sm" className="mt-2">
                          <Link href={`/annonces/${p.listing.publicNumber}#position`}>Prendre position</Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 rounded-[1.75rem] border border-line bg-paper p-6">
            <h2 className="text-xl font-semibold text-ink">Portefeuilles correspondants</h2>
            {correspondances.length === 0 ? (
              <p className="mt-2 text-[15px] text-muted">
                Aucun portefeuille publié ne correspond encore à vos critères. Vous serez
                prévenu dès qu’une annonce correspondante paraît.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {correspondances.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/annonces/${m.listing.publicNumber}#position`}
                      className="block rounded-2xl border border-line bg-surface p-4 hover:border-indigo"
                    >
                      <p className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-ink">Dossier n° {m.listing.publicNumber}</span>
                        <span className="tabular text-[13px] font-semibold text-indigo-dark">{m.score}/100</span>
                      </p>
                      <p className="mt-0.5 text-[14px] text-muted">{m.listing.displayedZone}</p>
                      <p className="tabular mt-2 font-bold text-ink">{formatEuroWhole(Number(m.listing.askingPrice))}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : estCedant ? (
        <section className="mt-8 rounded-[1.75rem] border border-indigo-line bg-indigo-soft p-6">
          <h2 className="text-xl font-semibold text-ink">Proposer mon portefeuille</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Votre annonce est signalée à l’acquéreur, qui peut prendre position dessus.
            Dès qu’il se positionne, il verse un dépôt de 2,5 % dans un trust,
            pour lancer la procédure de cession.
          </p>
          <div className="mt-5">
            {annoncesProposables.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[15px] text-ink">
                  Il vous faut une annonce en ligne pour répondre à cette demande.
                </p>
                <Button asChild variant="primary">
                  <Link href="/app/annonces/nouvelle">Publier un portefeuille</Link>
                </Button>
              </div>
            ) : (
              <ProposeListingForm
                mandateId={mandate.id}
                listings={annoncesProposables.map((l) => ({
                  id: l.id,
                  label: `N° ${l.publicNumber} · ${l.portfolio.label} · ${formatEuroWhole(Number(l.askingPrice))}`,
                  alreadyProposed: proposees.has(l.id),
                }))}
              />
            )}
          </div>
        </section>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="primary">
            <Link href="/annonces">Voir les portefeuilles à céder</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={depositHref}>Déposer ma demande d’acquisition</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
