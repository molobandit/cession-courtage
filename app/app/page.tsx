import Link from "next/link";
import { redirect } from "next/navigation";
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
  ToolTeaser,
} from "@/components/app/dashboard-cards";
import { ServiceIcon, type ServiceIconName } from "@/components/direct/service-icon";
import { NextActionBanner } from "@/components/dashboard/next-action-banner";
import { ReadinessPanel } from "@/components/dashboard/readiness-panel";
import { nextAction } from "@/lib/dashboard/next-action";
import { pipelineProgressPercent } from "@/lib/deal/pipeline";
import { ATTESTATIONS_LABEL, ESCROW_LABEL, KIT_LABEL } from "@/lib/direct/fees";
import { listMyDirectDeals } from "@/lib/direct/load";
import { SERVICE_ENTRIES, countByFilter, matchesFilter } from "@/lib/direct/services";
import {
  progressPercent as directProgress,
  stepByKey as directStep,
  type DirectStage,
} from "@/lib/direct/stages";
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
  if (actor.role === "INVESTOR") redirect("/app/mes-dossiers");

  const seller = canSell(actor);
  const buyer = canBuy(actor);

  const [portfolios, listings, mandates, offers, deals, publicListings, publicMandates, directs] =
    await Promise.all([
      seller ? listMyPortfolios(actor) : Promise.resolve([]),
      seller ? listMyListings(actor) : Promise.resolve([]),
      buyer ? listMyMandates(actor) : Promise.resolve([]),
      buyer ? listMyOffers(actor) : Promise.resolve([]),
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
  const recentDeals = activeDeals.slice(0, 4);
  const myListings = listings.slice(0, 4);
  const myPortfolios = portfolios.slice(0, 3);
  const myOffers = offers.slice(0, 3);
  const myMandates = mandates.slice(0, 3);

  /*
   * Vos dossiers en un coup d'œil : les deux parcours côte à côte. Le parcours
   * intermédié se compte en annonces et en offres, les services à la carte en
   * dossiers — un kit pris avec un séquestre compte dans les deux listes, parce
   * qu'on le cherchera dans l'une comme dans l'autre.
   */
  const directCounts = countByFilter(directs);
  const glance = [
    {
      href: "#mes-cessions",
      label: "Mes cessions",
      value: formatCount(seller ? listings.length : deals.filter((d) => d.sellerId === actor.id).length),
    },
    {
      href: "#mes-achats",
      label: "Mes achats",
      value: formatCount(buyer ? offers.length : deals.filter((d) => d.buyerId === actor.id).length),
    },
    ...SERVICE_ENTRIES.map((entry) => ({
      href: `/app/formaliser?dossiers=${entry.filter}#dossiers`,
      label: entry.listTitle,
      value: formatCount(directCounts[entry.filter]),
    })),
  ];

  const serviceTiles: {
    icon: ServiceIconName;
    title: string;
    detail: string;
    price?: string;
    href: string;
  }[] = [
    {
      icon: "kit",
      title: "Kit contractuel",
      detail: "Confidentialité, protocole et attestations, prêts à signer.",
      price: KIT_LABEL,
      href: "/app/formaliser?service=kit#nouveau",
    },
    {
      icon: "escrow",
      title: "Transaction sécurisée",
      detail: "Le prix bloqué sur un séquestre, libéré à la clôture.",
      price: ESCROW_LABEL,
      href: "/app/formaliser?service=escrow#nouveau",
    },
    {
      icon: "attestations",
      title: "Attestations de transfert",
      detail: "Une par compagnie, prête à envoyer.",
      price: ATTESTATIONS_LABEL,
      href: "/app/formaliser?service=attestations#nouveau",
    },
    ...(seller
      ? [
          {
            icon: "listing" as const,
            title: "Créer une annonce",
            detail: "Mettre en vente sous alias, sans frais de dépôt.",
            href: portfolios.length > 0 ? "/app/annonces/nouvelle" : "/app/import",
          },
        ]
      : []),
    ...(buyer
      ? [
          {
            icon: "wanted" as const,
            title: "Annonce d’achat",
            detail: "Décrivez le portefeuille que vous cherchez.",
            href: "/app/mandats",
          },
        ]
      : []),
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

      <section className="mt-8" aria-labelledby="actions-rapides">
        <h2 id="actions-rapides" className="text-xl font-bold tracking-tight text-ink">
          Actions rapides
        </h2>

        <div className="mt-4 rounded-[1.75rem] border border-line bg-paper p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-[17px] font-semibold text-ink">Parcours intermédié, tout compris</h3>
            <span className="rounded-full bg-indigo-soft px-2.5 py-1 text-[12px] font-medium text-indigo-dark">
              Accompagnement de A à Z
            </span>
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            Nous menons la cession de bout en bout : aucun service à ajouter, tout est inclus.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ...(seller
                ? [
                    {
                      icon: "sell" as const,
                      title: "Vendre",
                      detail: "Mettre votre portefeuille en vente",
                      href: portfolios.length > 0 ? "/app/annonces/nouvelle" : "/app/import",
                    },
                  ]
                : []),
              ...(buyer
                ? [
                    {
                      icon: "buy" as const,
                      title: "Acheter",
                      detail: "Trouver un portefeuille",
                      href: "/annonces",
                    },
                  ]
                : []),
            ].map((t) => (
              <li key={t.title}>
                <Link
                  href={t.href}
                  className="lift flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-indigo"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo text-white">
                    <ServiceIcon name={t.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[16px] font-semibold text-ink">{t.title}</span>
                    <span className="block text-[14px] text-muted">{t.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-[1.75rem] border border-line bg-paper p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-[17px] font-semibold text-ink">
              Boîte à malice : services à la carte, en toute autonomie
            </h3>
            <Link href="/app/formaliser" className="text-[14px] font-medium text-indigo-dark">
              Tous les services
            </Link>
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            Prenez seulement ce qui vous manque : vous économisez, sans rien céder sur la sécurité.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {serviceTiles.map((t) => (
              <li key={t.title}>
                <Link
                  href={t.href}
                  className="lift flex h-full flex-col rounded-2xl border border-line bg-surface p-4 hover:border-indigo"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-soft text-indigo-dark">
                    <ServiceIcon name={t.icon} className="h-5 w-5" />
                  </span>
                  <span className="mt-3 text-[15px] font-semibold leading-snug text-ink">{t.title}</span>
                  <span className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{t.detail}</span>
                  {t.price ? (
                    <span className="mt-3 text-[12px] font-medium text-indigo-dark">{t.price}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mt-8">
        <GlanceTiles items={glance} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
        {seller ? (
          <div id="mes-cessions" className="scroll-mt-24">
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
                    title={`Dossier n° ${l.publicNumber}`}
                    facts={[
                      { label: "Prix demandé", value: formatEuroWhole(Number(l.askingPrice)) },
                      { label: "Zone", value: l.displayedZone },
                    ]}
                  />
                ))}
              </ul>
            )}
          </Panel>
          </div>
        ) : null}

        {buyer ? (
          <div id="mes-achats" className="scroll-mt-24">
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
          </div>
        ) : null}
        </div>

        <Panel
          title="Projets en cours"
          href={recentDeals[0] ? `/app/dossiers/${recentDeals[0].id}` : "/annonces"}
          action={recentDeals.length > 0 ? "Ouvrir" : "Salle de marché"}
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
                    title={`Dossier n° ${d.listing.publicNumber}`}
                    facts={[
                      { label: "Prix convenu", value: formatEuroWhole(Number(d.agreedPrice)) },
                      { label: "Contrepartie", value: counterpartyDisplayName(counterparty) },
                      /*
                       * L'avancement dans la liste, pas seulement dans la fiche :
                       * la question que l'on se pose devant plusieurs dossiers est
                       * « où en est celui-ci », et y répondre exige sinon d'ouvrir
                       * chacun.
                       */
                      {
                        label: "Avancement",
                        value: `${pipelineProgressPercent(d.stage)} %`,
                      },
                    ]}
                    cta="Ouvrir le projet"
                  />
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {SERVICE_ENTRIES.map((entry) => {
          const liste = directs.filter((d) => matchesFilter(d, entry.filter));
          return (
            <Panel
              key={entry.key}
              title={entry.listTitle}
              href={`/app/formaliser?dossiers=${entry.filter}#dossiers`}
              action="Voir tout"
              count={liste.length}
            >
              {liste.length === 0 ? (
                <EmptyHint
                  text={`Pas encore de dossier « ${entry.title.toLowerCase()} ».`}
                  href={`/app/formaliser?service=${entry.key}#nouveau`}
                  label={entry.heading}
                />
              ) : (
                <ul className="grid gap-3">
                  {liste.slice(0, 3).map((d) => {
                    const services = { kit: d.kit, escrow: d.escrow, attestations: d.attestations };
                    return (
                      <ActivityCard
                        key={d.id}
                        href={`/app/formaliser/${d.id}`}
                        kicker={directStep(d.stage as DirectStage).label}
                        kickerTone={d.stage === "CLOSED" ? "ok" : "indigo"}
                        title={d.portfolioLabel}
                        facts={[
                          { label: "Prix convenu", value: formatEuroWhole(Number(d.salePrice)) },
                          {
                            label: "Avancement",
                            value: `${directProgress(d.stage as DirectStage, services)} %`,
                          },
                        ]}
                      />
                    );
                  })}
                </ul>
              )}
            </Panel>
          );
        })}
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
