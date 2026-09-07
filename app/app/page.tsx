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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl text-navy">Espace membre</h1>
          <p className="text-sm text-muted">
            {actor.fullName} · {roleLabel[actor.role]} · ORIAS {actor.oriasNumber} · alias {actor.publicAlias}
          </p>
        </div>
      </div>

      {canSell(actor) ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-serif text-lg text-navy">Portefeuilles</h2>
            <Link href="/app/import" className="text-sm underline-offset-2 hover:underline">
              Importer un portefeuille
            </Link>
          </div>
          <div className="mt-2 overflow-x-auto border border-line bg-paper">
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
                      Aucun portefeuille.{" "}
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
                        {p.valuations[0] ? formatEuro(p.valuations[0].midValue) : "—"}
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
        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-serif text-lg text-navy">Annonces</h2>
            <Link href="/app/annonces/nouvelle" className="text-sm underline-offset-2 hover:underline">
              Nouvelle annonce
            </Link>
          </div>
          <ListingTable listings={listings} />
        </section>
      ) : null}

      {canBuy(actor) ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-serif text-lg text-navy">Mandats de recherche</h2>
            <Link href="/app/mandats" className="text-sm underline-offset-2 hover:underline">
              Nouveau mandat
            </Link>
          </div>
          <div className="mt-2 overflow-x-auto border border-line bg-paper">
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
                      Aucun mandat pour le moment.
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
        <section className="mt-6">
          <h2 className="font-serif text-lg text-navy">Mes offres</h2>
          <div className="mt-2 overflow-x-auto border border-line bg-paper">
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
                      Aucune offre déposée.
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

      <section className="mt-6">
        <h2 className="font-serif text-lg text-navy">Dossiers</h2>
        <div className="mt-2 overflow-x-auto border border-line bg-paper">
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
                    Aucun dossier en cours.
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
    return <p className="mt-2 text-sm text-muted">Aucune annonce publiée.</p>;
  }
  return (
    <div className="mt-2 overflow-x-auto border border-line bg-paper">
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
