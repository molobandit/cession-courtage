import { redirect } from "next/navigation";
import {
  canBuy,
  canSell,
  counterpartyDisplayName,
  getActor,
  isOriasVerified,
  listBuyerMatches,
  listMyDeals,
  listMyListings,
  listMyMandates,
  listMyOffers,
  listMyPortfolios,
  listPublicMandates,
} from "@/lib/authz";
import {
  ActivityCard,
  CompactListingCard,
  CompactMandateCard,
  EmptyHint,
  GlanceTiles,
  MarketplaceHero,
  Panel,
  PublishBanner,
  ShortcutCard,
  ToolTeaser,
} from "@/components/app/dashboard-cards";
import { NextActionBanner } from "@/components/dashboard/next-action-banner";
import { ReadinessPanel } from "@/components/dashboard/readiness-panel";
import { nextAction } from "@/lib/dashboard/next-action";
import { readinessAxes, readinessScore } from "@/lib/dashboard/readiness";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import { asStringArray } from "@/lib/json-array";
import {
  DEAL_STAGE_LABELS,
  LISTING_STATUS_LABELS,
  OFFER_STATUS_LABELS,
  RISK_TYPE_LABELS,
} from "@/lib/labels";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Tableau de bord" };

const DAY_MS = 24 * 60 * 60 * 1000;

function listingTone(status: string): "indigo" | "ok" | "warn" | "mute" {
  if (status === "UNDER_NEGOTIATION" || status === "SOLD") return "ok";
  if (status === "DRAFT" || status === "OFFERS_CLOSED") return "warn";
  if (status === "WITHDRAWN") return "mute";
  return "indigo";
}

export default async function MemberHomePage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const seller = canSell(actor);
  const buyer = canBuy(actor);

  const [portfolios, listings, mandates, offers, deals, publicListings, publicMandates, matches] =
    await Promise.all([
      seller ? listMyPortfolios(actor) : Promise.resolve([]),
      seller ? listMyListings(actor) : Promise.resolve([]),
      buyer ? listMyMandates(actor) : Promise.resolve([]),
      buyer ? listMyOffers(actor) : Promise.resolve([]),
      listMyDeals(actor),
      loadPublicListingCards(),
      listPublicMandates(),
      buyer ? listBuyerMatches(actor) : Promise.resolve([]),
    ]);

  const draft = listings.find((l) => l.status === "DRAFT");
  const openWindow = listings
    .map((l) => l.offerWindowClosesAt)
    .filter((d): d is Date => d !== null && d.getTime() > Date.now())
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const activeDeals = deals.filter((d) => d.stage !== "CLOSED");
  // Cibles precises de l'action proposee : un bouton doit mener a l'endroit ou
  // l'on agit, pas recharger le tableau de bord.
  const retentionDeal = deals.find((d) => d.stage === "RETENTION") ?? null;
  const offersListing = listings.find((l) => l.status === "OFFERS_CLOSED") ?? null;
  const openWindowListing =
    listings.find(
      (l) => l.offerWindowClosesAt !== null && l.offerWindowClosesAt.getTime() > Date.now(),
    ) ?? null;
  const unvaluedPortfolio = portfolios.find((p) => p.valuations.length === 0) ?? null;

  const action = nextAction({
    canSell: seller,
    canBuy: buyer,
    portfolioCount: portfolios.length,
    unvaluedPortfolioCount: portfolios.filter((p) => p.valuations.length === 0).length,
    draftListing: draft ? { publicNumber: draft.publicNumber, id: draft.id } : null,
    openWindowDaysLeft: openWindow
      ? Math.max(0, Math.ceil((openWindow.getTime() - Date.now()) / DAY_MS))
      : null,
    offersToReview: listings.filter((l) => l.status === "OFFERS_CLOSED").length,
    activeDealCount: activeDeals.length,
    mandateCount: mandates.length,
    retentionDue: deals.filter((d) => d.stage === "RETENTION").length,
    retentionDeal: retentionDeal ? { id: retentionDeal.id } : null,
    offersListing: offersListing ? { id: offersListing.id } : null,
    activeDeal: activeDeals[0] ? { id: activeDeals[0].id } : null,
    openWindowListing: openWindowListing
      ? { publicNumber: openWindowListing.publicNumber }
      : null,
    unvaluedPortfolio: unvaluedPortfolio ? { id: unvaluedPortfolio.id } : null,
  });

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

  const firstName = actor.fullName?.split(" ")[0] ?? "";
  const recentListings = publicListings.slice(0, 3);
  const recentMandates = publicMandates.slice(0, 3);
  const recentDeals = activeDeals.slice(0, 4);
  const myListings = listings.slice(0, 4);
  const myPortfolios = portfolios.slice(0, 3);
  const myOffers = offers.slice(0, 3);
  const myMandates = mandates.slice(0, 3);

  const totalCommissions = portfolios.reduce((sum, p) => sum + Number(p.annualCommissions), 0);
  const totalValuation = portfolios.reduce(
    (sum, p) => sum + (p.valuations[0] ? Number(p.valuations[0].midValue) : 0),
    0,
  );

  const glance = seller
    ? [
        { href: "/app/import", label: "Commissions / an", value: formatEuroWhole(totalCommissions) },
        {
          href: portfolios[0] ? `/app/portefeuilles/${portfolios[0].id}` : "/app/import",
          label: "Valorisation médiane",
          value: formatEuroWhole(totalValuation),
        },
        { href: "/app/annonces/nouvelle", label: "Annonces", value: formatCount(listings.length) },
        {
          href: recentDeals[0] ? `/app/dossiers/${recentDeals[0].id}` : "/app",
          label: "Dossiers",
          value: formatCount(deals.length),
        },
      ]
    : [
        { href: "/app/mandats", label: "Mandats", value: formatCount(mandates.length) },
        { href: "/app/opportunites", label: "Correspondances", value: formatCount(matches.length) },
        { href: "/annonces", label: "Offres", value: formatCount(offers.length) },
        {
          href: recentDeals[0] ? `/app/dossiers/${recentDeals[0].id}` : "/app",
          label: "Dossiers",
          value: formatCount(deals.length),
        },
      ];

  const tools = [
    ...(seller
      ? [
          {
            href: "/app/import",
            title: "Importer un bordereau",
            detail: "CSV ou XLSX. Les colonnes nominatives sont refusées.",
          },
          {
            href: "/valoriser",
            title: "Estimer un portefeuille",
            detail: "Fourchette de valeur, chaque poste chiffré.",
          },
        ]
      : []),
    ...(buyer
      ? [
          {
            href: "/app/mandats",
            title: "Mandat d’achat",
            detail: "Une fois les critères posés, les dossiers suivent.",
          },
        ]
      : []),
    {
      href: "/certification",
      title: "Portefeuille vérifié",
      detail: "Kbis, identité, ORIAS et documents du dossier.",
    },
  ].slice(0, 3);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {seller ? (
        <div className="mb-5">
          <PublishBanner href={portfolios.length > 0 ? "/app/annonces/nouvelle" : "/app/import"} />
        </div>
      ) : null}

      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-4xl">
        Tableau de bord
      </h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted sm:mt-2">
        Bonjour {firstName}. Catalogue, vos dossiers et la suite à donner, sur un
        seul écran.
      </p>

      <div className="mt-6">
        <NextActionBanner action={action} />
      </div>

      <div className="mt-6">
        <MarketplaceHero />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Derniers portefeuilles" href="/annonces" action="Voir tout">
          {recentListings.length === 0 ? (
            <EmptyHint
              text="Aucun portefeuille publié pour le moment."
              href="/annonces"
              label="Ouvrir le catalogue"
            />
          ) : (
            <ul className="grid gap-3">
              {recentListings.map((item) => (
                <CompactListingCard key={item.id} item={item} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Demandes d’acquisition" href="/annonces/demandes" action="Voir tout">
          {recentMandates.length === 0 ? (
            <EmptyHint
              text="Aucune demande d’acquisition publiée pour le moment."
              href="/annonces/demandes"
              label="Voir les demandes"
            />
          ) : (
            <ul className="grid gap-3">
              {recentMandates.map((m) => {
                const zones = asStringArray(m.zones);
                const nationwide = zones.includes("NATIONAL");
                return (
                  <CompactMandateCard
                    key={m.id}
                    href="/annonces/demandes"
                    number={m.publicNumber ?? 0}
                    alias={m.buyer.publicAlias}
                    zone={
                      nationwide
                        ? "France entière"
                        : zones.filter((z) => z !== "NATIONAL").join(", ") || "Zone non précisée"
                    }
                    branches={asStringArray(m.riskTypes)
                      .slice(0, 4)
                      .map((r) => RISK_TYPE_LABELS[r as keyof typeof RISK_TYPE_LABELS] ?? r)
                      .join(", ")}
                    budget={formatEuroWhole(Number(m.maxBudget))}
                    commissions={`${formatEuroWhole(Number(m.minCommissions))} à ${formatEuroWhole(Number(m.maxCommissions))}`}
                  />
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold tracking-tight text-ink">Actions rapides</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {seller ? (
            <li>
              <ShortcutCard
                kicker="Céder"
                title="Mettre un portefeuille en vente"
                detail="Import, valorisation en cascade, puis annonce sous alias."
                href={portfolios.length > 0 ? "/app/annonces/nouvelle" : "/app/import"}
                cta={portfolios.length > 0 ? "Créer une annonce" : "Importer un bordereau"}
              />
            </li>
          ) : null}
          {buyer ? (
            <li>
              <ShortcutCard
                kicker="Acquérir"
                title="Parcourir les portefeuilles"
                detail="Commissions, zone, fenêtre d’offres. Sans raison sociale."
                href="/annonces"
                cta="Voir le catalogue"
              />
            </li>
          ) : null}
          <li>
            <ShortcutCard
              kicker="Conclure"
              title="Suivre un dossier jusqu’au transfert"
              detail="Confidentialité, salle de données, séquestre, ORIAS."
              href={activeDeals[0] ? `/app/dossiers/${activeDeals[0].id}` : "/app/outils"}
              cta={activeDeals[0] ? "Ouvrir le projet" : "Voir les outils"}
            />
          </li>
        </ul>
      </section>

      <div className="mt-8">
        <GlanceTiles items={glance} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
        {seller ? (
          <Panel title="Mes cessions" href="/app/annonces/nouvelle" action="Nouvelle annonce" count={listings.length}>
            {myListings.length === 0 ? (
              myPortfolios.length > 0 ? (
                <ul className="grid gap-3">
                  {myPortfolios.map((p) => (
                    <ActivityCard
                      key={p.id}
                      href={`/app/portefeuilles/${p.id}`}
                      kicker={p.valuations[0] ? "Valorisé" : "À valoriser"}
                      kickerTone={p.valuations[0] ? "ok" : "warn"}
                      title={p.label}
                      facts={[
                        { label: "Commissions", value: formatEuroWhole(Number(p.annualCommissions)) },
                        {
                          label: "Valorisation",
                          value: p.valuations[0]
                            ? formatEuroWhole(Number(p.valuations[0].midValue))
                            : "Non calculée",
                        },
                      ]}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyHint
                  text="Déposez un bordereau pour valoriser, puis publier sous alias."
                  href="/app/import"
                  label="Importer un bordereau"
                />
              )
            ) : (
              <ul className="grid gap-3">
                {myListings.map((l) => (
                  <ActivityCard
                    key={l.id}
                    href={`/app/annonces/${l.id}`}
                    kicker={LISTING_STATUS_LABELS[l.status]}
                    kickerTone={listingTone(l.status)}
                    title={`Portefeuille #${l.publicNumber}`}
                    facts={[
                      { label: "Prix demandé", value: formatEuroWhole(Number(l.askingPrice)) },
                      { label: "Zone", value: l.displayedZone },
                    ]}
                  />
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        {buyer ? (
          <Panel title="Mes achats" href="/app/mandats" action="Mandats" count={offers.length + mandates.length}>
            {myOffers.length === 0 && myMandates.length === 0 ? (
              <EmptyHint
                text="Décrivez une fois ce que vous cherchez. Les dossiers correspondants suivent."
                href="/app/mandats"
                label="Déposer un mandat"
              />
            ) : (
              <ul className="grid gap-3">
                {myOffers.map((o) => (
                  <ActivityCard
                    key={o.id}
                    href={`/annonces/${o.listing.publicNumber}`}
                    kicker={OFFER_STATUS_LABELS[o.status]}
                    title={`Offre sur #${o.listing.publicNumber}`}
                    facts={[
                      { label: "Montant", value: formatEuroWhole(Number(o.amount)) },
                      { label: "Zone", value: o.listing.displayedZone },
                    ]}
                  />
                ))}
                {myMandates.map((m) => (
                  <ActivityCard
                    key={m.id}
                    href="/app/mandats"
                    kicker="Mandat"
                    kickerTone="mute"
                    title={`Jusqu’à ${formatEuroWhole(Number(m.maxBudget))}`}
                    facts={[
                      {
                        label: "Commissions",
                        value: `${formatEuroWhole(Number(m.minCommissions))} à ${formatEuroWhole(Number(m.maxCommissions))}`,
                      },
                      { label: "Correspondances", value: formatCount(m._count.matches) },
                    ]}
                  />
                ))}
              </ul>
            )}
          </Panel>
        ) : null}
        </div>

        <Panel
          title="Projets en cours"
          href={recentDeals[0] ? `/app/dossiers/${recentDeals[0].id}` : "/annonces"}
          action={recentDeals.length > 0 ? "Ouvrir" : "Catalogue"}
          count={activeDeals.length}
        >
          {recentDeals.length === 0 ? (
            <EmptyHint
              text="Un projet s’ouvre lorsque vous retenez une offre, ou lorsqu’un cédant retient la vôtre."
              href="/annonces"
              label="Voir les annonces"
            />
          ) : (
            <ul className="grid gap-3">
              {recentDeals.map((d) => {
                const isSeller = d.sellerId === actor.id;
                const counterparty = isSeller ? d.buyer : d.seller;
                return (
                  <ActivityCard
                    key={d.id}
                    href={`/app/dossiers/${d.id}`}
                    kicker={`${isSeller ? "Cession" : "Acquisition"} · ${DEAL_STAGE_LABELS[d.stage]}`}
                    title={`Portefeuille #${d.listing.publicNumber}`}
                    facts={[
                      { label: "Prix convenu", value: formatEuroWhole(Number(d.agreedPrice)) },
                      { label: "Contrepartie", value: counterpartyDisplayName(counterparty) },
                    ]}
                    cta="Ouvrir le projet"
                  />
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {seller ? (
        <div className="mt-8">
          <ReadinessPanel axes={axes} score={readinessScore(axes)} />
        </div>
      ) : null}

      <div className="mt-8">
        <Panel title="Outils" href="/app/outils" action="Tous les outils">
          <ul className="grid gap-3 sm:grid-cols-3">
            {tools.map((tool) => (
              <ToolTeaser key={tool.href} {...tool} />
            ))}
          </ul>
        </Panel>
      </div>
    </main>
  );
}
