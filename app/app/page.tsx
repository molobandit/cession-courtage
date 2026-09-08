import Link from "next/link";
import {
  canBuy,
  canSell,
  counterpartyDisplayName,
  getActor,
  isOriasVerified,
  listMyDeals,
  listMyListings,
  listMyMandates,
  listMyOffers,
  listMyPortfolios,
} from "@/lib/authz";
import { formatDate, formatEuro } from "@/lib/format/fr";
import { nextAction } from "@/lib/dashboard/next-action";
import { NextActionBanner } from "@/components/dashboard/next-action-banner";
import { ReadinessPanel } from "@/components/dashboard/readiness-panel";
import { readinessAxes, readinessScore } from "@/lib/dashboard/readiness";
import { prisma } from "@/lib/prisma";
import { asStringArray } from "@/lib/json-array";
import { DEAL_STAGE_LABELS, LISTING_STATUS_LABELS, OFFER_STATUS_LABELS } from "@/lib/labels";
import { redirect } from "next/navigation";

export const metadata = { title: "Espace membre" };

const roleLabel = {
  SELLER: "Cédant",
  BUYER: "Acquéreur",
  BOTH: "Cédant et acquéreur",
  ADMIN: "Administrateur",
} as const;

export default async function MemberHomePage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  const [portfolios, listings, mandates, offers, deals] = await Promise.all([
    canSell(actor) ? listMyPortfolios(actor) : Promise.resolve([]),
    canSell(actor) ? listMyListings(actor) : Promise.resolve([]),
    canBuy(actor) ? listMyMandates(actor) : Promise.resolve([]),
    canBuy(actor) ? listMyOffers(actor) : Promise.resolve([]),
    listMyDeals(actor),
  ]);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const draft = listings.find((l) => l.status === "DRAFT");
  const openWindow = listings
    .map((l) => l.offerWindowClosesAt)
    .filter((d): d is Date => d !== null && d.getTime() > Date.now())
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const action = nextAction({
    canSell: canSell(actor),
    canBuy: canBuy(actor),
    portfolioCount: portfolios.length,
    unvaluedPortfolioCount: portfolios.filter((p) => p.valuations.length === 0).length,
    draftListing: draft ? { publicNumber: draft.publicNumber, id: draft.id } : null,
    openWindowDaysLeft: openWindow
      ? Math.max(0, Math.ceil((openWindow.getTime() - Date.now()) / DAY_MS))
      : null,
    offersToReview: listings.filter((l) => l.status === "OFFERS_CLOSED").length,
    activeDealCount: deals.filter((d) => d.stage !== "CLOSED").length,
    mandateCount: mandates.length,
    retentionDue: deals.filter((d) => d.stage === "RETENTION").length,
  });

  // Préparation : calculée depuis les données, jamais déclarée par le courtier.
  const firmId = actor.firmId;
  const [carrierTotal, carrierDecided, checklistRows] = firmId
    ? await Promise.all([
        prisma.carrierCode.count({ where: { portfolio: { firmId } } }),
        prisma.carrierCode.count({
          where: { portfolio: { firmId }, status: { in: ["AGREED", "REFUSED"] } },
        }),
        prisma.dueDiligenceItem.findMany({
          where: { deal: { sellerId: actor.id }, required: true },
          select: { providedAt: true },
        }),
      ])
    : [0, 0, []];

  const axes = readinessAxes({
    portfolioCount: portfolios.length,
    valuedCount: portfolios.filter((p) => p.valuations.length > 0).length,
    publishedListings: listings.filter((l) => l.status !== "DRAFT").length,
    carrierCodesTotal: carrierTotal,
    carrierCodesDecided: carrierDecided,
    checklistRequired: checklistRows.length,
    checklistProvided: checklistRows.filter((i) => i.providedAt !== null).length,
    firstPortfolioId: portfolios[0]?.id ?? null,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Espace membre</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            {actor.fullName} · {roleLabel[actor.role]} · ORIAS {actor.oriasNumber} · alias{" "}
            {actor.publicAlias}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <NextActionBanner action={action} />
      </div>

      {canSell(actor) ? (
        <div className="mt-10">
          <ReadinessPanel axes={axes} score={readinessScore(axes)} />
        </div>
      ) : null}

      {canSell(actor) ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold text-ink">Portefeuilles</h2>
            <Link href="/app/import" className="text-[15px] font-medium text-gold-deep underline-offset-4 hover:underline">
              Importer un portefeuille
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto rounded-3xl border border-line bg-paper">
            <table className="w-full text-sm">
              <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Libellé</th>
                  <th className="px-2 py-1.5 text-right font-medium">Contrats</th>
                  <th className="px-2 py-1.5 text-right font-medium">Clients</th>
                  <th className="px-2 py-1.5 text-right font-medium">Commissions / an</th>
                  <th className="px-2 py-1.5 text-right font-medium">Valorisation</th>
                  <th className="px-2 py-1.5 font-medium">Import</th>
                </tr>
              </thead>
              <tbody>
                {portfolios.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-muted" colSpan={6}>
                      Aucun portefeuille importé. Tout commence ici : déposez un
                      bordereau, les colonnes nominatives sont refusées.{" "}
                      <Link href="/app/import" className="underline-offset-2 hover:underline">
                        Importer un bordereau
                      </Link>
                    </td>
                  </tr>
                ) : (
                  portfolios.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-2 py-1.5">
                        <Link href={`/app/portefeuilles/${p.id}`} className="underline-offset-2 hover:underline">
                          {p.label}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.contractCount}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.clientCount}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {formatEuro(p.annualCommissions)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {p.valuations[0] ? formatEuro(p.valuations[0].midValue) : "Non calculée"}
                      </td>
                      <td className="px-2 py-1.5">{formatDate(p.importedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {canSell(actor) ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold text-ink">Annonces</h2>
            <Link href="/app/annonces/nouvelle" className="text-[15px] font-medium text-gold-deep underline-offset-4 hover:underline">
              Nouvelle annonce
            </Link>
          </div>
          <ListingTable listings={listings} />
        </section>
      ) : null}

      {canBuy(actor) ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold text-ink">Mandats de recherche</h2>
            <Link href="/app/mandats" className="text-[15px] font-medium text-gold-deep underline-offset-4 hover:underline">
              Nouveau mandat
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto rounded-3xl border border-line bg-paper">
            <table className="w-full text-sm">
              <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Budget max</th>
                  <th className="px-2 py-1.5 text-right font-medium">Commissions min</th>
                  <th className="px-2 py-1.5 text-right font-medium">Commissions max</th>
                  <th className="px-2 py-1.5 font-medium">Zones</th>
                  <th className="px-2 py-1.5 text-right font-medium">Correspondances</th>
                </tr>
              </thead>
              <tbody>
                {mandates.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-muted" colSpan={5}>
                      Aucun mandat déposé. Décrivez une fois ce que vous cherchez,
                      les dossiers correspondants vous seront présentés
                      automatiquement.{" "}
                      <Link href="/app/mandats" className="underline-offset-2 hover:underline">
                        Déposer un mandat
                      </Link>
                    </td>
                  </tr>
                ) : (
                  mandates.map((m) => (
                    <tr key={m.id} className="border-t border-line">
                      <td className="px-2 py-1.5 tabular-nums">{formatEuro(m.maxBudget)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{formatEuro(m.minCommissions)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{formatEuro(m.maxCommissions)}</td>
                      <td className="px-2 py-1.5">{asStringArray(m.zones).join(", ")}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{m._count.matches}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {canBuy(actor) ? (
        <section className="mt-10">
          <h2 className="font-serif text-xl font-semibold text-ink">Mes offres</h2>
          <div className="mt-3 overflow-x-auto rounded-3xl border border-line bg-paper">
            <table className="w-full text-sm">
              <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Dossier</th>
                  <th className="px-2 py-1.5 text-right font-medium">Montant</th>
                  <th className="px-2 py-1.5 text-right font-medium">Comptant</th>
                  <th className="px-2 py-1.5 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {offers.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-muted" colSpan={4}>
                      Aucune offre déposée. Les annonces dont la fenêtre est
                      ouverte acceptent une proposition.{" "}
                      <Link href="/annonces" className="underline-offset-2 hover:underline">
                        Voir les annonces
                      </Link>
                    </td>
                  </tr>
                ) : (
                  offers.map((o) => (
                    <tr key={o.id} className="border-t border-line">
                      <td className="px-2 py-1.5">#{o.listing.publicNumber}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{formatEuro(o.amount)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {Number(o.upfrontPercent).toLocaleString("fr-FR")} %
                      </td>
                      <td className="px-2 py-1.5">{OFFER_STATUS_LABELS[o.status]}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold text-ink">Dossiers</h2>
        <div className="mt-3 overflow-x-auto rounded-3xl border border-line bg-paper">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-1.5 font-medium">Dossier</th>
                <th className="px-2 py-1.5 font-medium">Étape</th>
                <th className="px-2 py-1.5 font-medium">Contrepartie</th>
                <th className="px-2 py-1.5 text-right font-medium">Prix convenu</th>
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-muted" colSpan={4}>
                    Aucun dossier en cours. Un dossier s’ouvre lorsque vous
                    retenez une offre, ou lorsqu’un cédant retient la vôtre.
                  </td>
                </tr>
              ) : (
                deals.map((d) => {
                  const counterparty =
                    d.seller.kind === "identified" && d.seller.id === actor.id ? d.buyer : d.seller;
                  const label = counterpartyDisplayName(counterparty);
                  return (
                    <tr key={d.id} className="border-t border-line">
                      <td className="px-2 py-1.5">
                        <Link href={`/app/dossiers/${d.id}`} className="underline-offset-2 hover:underline">
                          #{d.listing.publicNumber}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5">{DEAL_STAGE_LABELS[d.stage]}</td>
                      <td className="px-2 py-1.5">{label}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{formatEuro(Number(d.agreedPrice))}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function ListingTable({
  listings,
}: {
  listings: Awaited<ReturnType<typeof listMyListings>>;
}) {
  if (listings.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted">
        Aucune annonce. Publiez un portefeuille importé pour recevoir des offres.{" "}
        <Link href="/app/annonces/nouvelle" className="underline-offset-2 hover:underline">
          Créer une annonce
        </Link>
      </p>
    );
  }
  return (
    <div className="mt-3 overflow-x-auto rounded-3xl border border-line bg-paper">
      <table className="w-full text-sm">
        <thead className="bg-cream text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-2 py-1.5 font-medium">Réf.</th>
            <th className="px-2 py-1.5 font-medium">Portefeuille</th>
            <th className="px-2 py-1.5 font-medium">Statut</th>
            <th className="px-2 py-1.5 text-right font-medium">Prix demandé</th>
            <th className="px-2 py-1.5 font-medium">Zone</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id} className="border-t border-line">
              <td className="px-2 py-1.5">
                <Link href={`/app/annonces/${l.id}`} className="underline-offset-2 hover:underline">
                  #{l.publicNumber}
                </Link>
              </td>
              <td className="px-2 py-1.5">{l.portfolio.label}</td>
              <td className="px-2 py-1.5">{LISTING_STATUS_LABELS[l.status]}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{formatEuro(l.askingPrice)}</td>
              <td className="px-2 py-1.5">{l.displayedZone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
