import { redirect } from "next/navigation";
import {
  canBuy,
  canSell,
  getActor,
  isOriasVerified,
  listMyDeals,
  listMyListings,
  listMyMandates,
  listMyPortfolios,
  listPublicMandates,
} from "@/lib/authz";
import {
  CompactListingCard,
  CompactMandateCard,
  EmptyHint,
  MarketplaceHero,
  Panel,
  PublishBanner,
  ToolTeaser,
} from "@/components/app/dashboard-cards";
import {
  ActionGroup,
  ActionTile,
  DossierCard,
  GlanceCounter,
  RecentPanel,
  SectionHeading,
} from "@/components/app/toolbox";
import { DirectDealCard } from "@/components/direct/direct-deal-card";
import { NextActionBanner } from "@/components/dashboard/next-action-banner";
import { ReadinessPanel } from "@/components/dashboard/readiness-panel";
import { nextAction } from "@/lib/dashboard/next-action";
import { loadMemberDossiers } from "@/lib/dashboard/member-dossiers";
import { listMyDirectDeals } from "@/lib/direct/load";
import {
  SERVICE_ENTRIES,
  countByFilter,
  matchesFilter,
  serviceCreateHref,
  serviceListHref,
} from "@/lib/direct/services";
import { readinessAxes, readinessScore } from "@/lib/dashboard/readiness";
import { formatEuroWhole } from "@/lib/format/number";
import { asStringArray } from "@/lib/json-array";
import { RISK_TYPE_LABELS } from "@/lib/labels";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Tableau de bord" };

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function MemberHomePage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (actor.role === "INVESTOR") redirect("/app/mes-dossiers");

  const seller = canSell(actor);
  const buyer = canBuy(actor);

  const [portfolios, listings, mandates, deals, publicListings, publicMandates, directs] =
    await Promise.all([
      seller ? listMyPortfolios(actor) : Promise.resolve([]),
      seller ? listMyListings(actor) : Promise.resolve([]),
      buyer ? listMyMandates(actor) : Promise.resolve([]),
      listMyDeals(actor),
      loadPublicListingCards(),
      listPublicMandates(),
      listMyDirectDeals(actor.id, actor.email),
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

  const recentListings = publicListings.slice(0, 3);
  const recentMandates = publicMandates.slice(0, 3);

  const { cessions, achats } = await loadMemberDossiers(actor);
  const directCounts = countByFilter(directs);
  const annonceHref = portfolios.length > 0 ? "/app/annonces/nouvelle" : "/app/import";
  const TONE_SERVICE = { kit: "kit", escrow: "escrow", attestations: "attestations" } as const;
  const ICON_SERVICE = { kit: "clipboard", escrow: "shield", attestations: "file-check" } as const;

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
        Salle de marché, vos dossiers et la suite à donner, sur un
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

        <Panel title="Demandes d’acquisition" href="/app/mandats" action="Déposer">
          {recentMandates.length === 0 ? (
            <EmptyHint
              text="Aucune demande d’acquisition publiée pour le moment."
              href="/app/mandats"
              label="Déposer ma demande"
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

      {/*
       * Actions rapides, dossiers en un coup d'œil, dossiers récents : la
       * disposition que les courtiers connaissent déjà. Le parcours tout compris
       * et les services à la carte côte à côte, pour que le choix se fasse d'un
       * regard.
       */}
      <section className="mt-10 scroll-mt-24" id="actions-rapides" aria-labelledby="titre-actions-rapides">
        <SectionHeading icon="bolt" title="Actions rapides" id="titre-actions-rapides" />
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          <ActionGroup
            icon="briefcase"
            iconColor="#6d5dd3"
            title="Parcours intermédié toutes options, avec assistance bout en bout"
            lede="En choisissant ce parcours, vous n’avez pas besoin d’ajouter d’autres services car tout est compris."
          >
            {seller ? (
              <ActionTile href={annonceHref} icon="bag" tone="sell" title="Vendre" subtitle="Listez votre portefeuille" />
            ) : null}
            {buyer ? (
              <ActionTile href="/annonces" icon="search" tone="buy" title="Acheter" subtitle="Trouvez un portefeuille" />
            ) : null}
          </ActionGroup>

          <ActionGroup
            icon="tools"
            iconColor="#3f8c61"
            title="Boîte à malice des services à la carte en toute autonomie"
            lede="En choisissant l’un ou l’autre de ces services, vous réalisez des économies, tout en conservant un haut niveau de sécurité."
          >
            {SERVICE_ENTRIES.map((entry) => (
              <ActionTile
                key={entry.key}
                href={serviceCreateHref(entry)}
                icon={ICON_SERVICE[entry.key]}
                tone={TONE_SERVICE[entry.key]}
                title={entry.title}
                subtitle={entry.tagline}
              />
            ))}
            {seller ? (
              <ActionTile href={annonceHref} icon="megaphone" tone="listing" title="Créer une annonce" subtitle="Mettre en vente" />
            ) : null}
            {buyer ? (
              <ActionTile
                href="/app/mandats"
                icon="cart"
                tone="wanted"
                title="Annonce d’achat"
                subtitle="Trouvez un portefeuille à acheter"
              />
            ) : null}
          </ActionGroup>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="vos-dossiers">
        <SectionHeading icon="chart" title="Vos dossiers en un coup d’œil" id="vos-dossiers" />
        <ul className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <GlanceCounter
            href="/app/cessions"
            icon="bag"
            tone="sell"
            value={cessions.length}
            badge={cessions.filter((c) => c.active).length}
            label="Mes cessions"
          />
          <GlanceCounter
            href="/app/achats"
            icon="search"
            tone="buy"
            value={achats.length}
            badge={achats.filter((c) => c.active).length}
            label="Mes achats"
          />
          {SERVICE_ENTRIES.map((entry) => (
            <GlanceCounter
              key={entry.key}
              href={serviceListHref(entry)}
              icon={ICON_SERVICE[entry.key]}
              tone={TONE_SERVICE[entry.key]}
              value={directCounts[entry.filter]}
              label={entry.listTitle}
            />
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="dossiers-recents">
        <SectionHeading icon="doc" title="Dossiers récents" id="dossiers-recents" />
        <div className="mt-5 grid gap-5">
          <RecentPanel
            icon="bag"
            tone="sell"
            title="Mes cessions"
            count={cessions.length}
            href="/app/cessions"
            emptyText="Pas encore de cessions"
          >
            {cessions.length > 0
              ? cessions.slice(0, 3).map(({ key, active: _active, ...item }) => <DossierCard key={key} {...item} />)
              : null}
          </RecentPanel>

          <RecentPanel
            icon="search"
            tone="buy"
            title="Mes achats"
            count={achats.length}
            href="/app/achats"
            emptyText="Pas encore d’achats"
          >
            {achats.length > 0
              ? achats.slice(0, 3).map(({ key, active: _active, ...item }) => <DossierCard key={key} {...item} />)
              : null}
          </RecentPanel>

          {SERVICE_ENTRIES.map((entry) => {
            const liste = directs.filter((d) => matchesFilter(d, entry.filter));
            return (
              <RecentPanel
                key={entry.key}
                icon={ICON_SERVICE[entry.key]}
                tone={TONE_SERVICE[entry.key]}
                title={entry.listTitle}
                href={serviceListHref(entry)}
                emptyText={entry.emptyShort}
              >
                {liste.length > 0
                  ? liste
                      .slice(0, 3)
                      .map((d) => (
                        <DirectDealCard key={d.id} deal={d} viewerId={actor.id} tone={TONE_SERVICE[entry.key]} />
                      ))
                  : null}
              </RecentPanel>
            );
          })}
        </div>
      </section>

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
