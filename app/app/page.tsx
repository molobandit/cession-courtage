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
} from "@/lib/authz";
import { NextActionBanner } from "@/components/dashboard/next-action-banner";
import { ReadinessPanel } from "@/components/dashboard/readiness-panel";
import { SummaryList, type SummaryRow } from "@/components/dashboard/summary-list";
import { nextAction } from "@/lib/dashboard/next-action";
import { readinessAxes, readinessScore } from "@/lib/dashboard/readiness";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import { asStringArray } from "@/lib/json-array";
import { DEAL_STAGE_LABELS, LISTING_STATUS_LABELS, OFFER_STATUS_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Espace membre" };

const ROLE_LABEL = {
  SELLER: "Cédant",
  BUYER: "Acquéreur",
  BOTH: "Cédant et acquéreur",
  ADMIN: "Administrateur",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function MemberHomePage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const seller = canSell(actor);
  const buyer = canBuy(actor);

  const [portfolios, listings, mandates, offers, deals] = await Promise.all([
    seller ? listMyPortfolios(actor) : Promise.resolve([]),
    seller ? listMyListings(actor) : Promise.resolve([]),
    buyer ? listMyMandates(actor) : Promise.resolve([]),
    buyer ? listMyOffers(actor) : Promise.resolve([]),
    listMyDeals(actor),
  ]);

  const draft = listings.find((l) => l.status === "DRAFT");
  const openWindow = listings
    .map((l) => l.offerWindowClosesAt)
    .filter((d): d is Date => d !== null && d.getTime() > Date.now())
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const activeDeals = deals.filter((d) => d.stage !== "CLOSED");

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

  // Trois chiffres, pas davantage. Un tableau de bord qui affiche tout n'affiche rien.
  const totalCommissions = portfolios.reduce((sum, p) => sum + Number(p.annualCommissions), 0);
  const totalValuation = portfolios.reduce(
    (sum, p) => sum + (p.valuations[0] ? Number(p.valuations[0].midValue) : 0),
    0,
  );
  const kpis = seller
    ? [
        { label: "Commissions annuelles", value: formatEuroWhole(totalCommissions) },
        { label: "Valorisation médiane", value: formatEuroWhole(totalValuation) },
        { label: "Dossiers en cours", value: formatCount(activeDeals.length) },
      ]
    : [
        { label: "Mandats déposés", value: formatCount(mandates.length) },
        { label: "Offres en cours", value: formatCount(offers.length) },
        { label: "Dossiers en cours", value: formatCount(activeDeals.length) },
      ];

  const portfolioRows: SummaryRow[] = portfolios.map((p) => ({
    id: p.id,
    href: `/app/portefeuilles/${p.id}`,
    title: p.label,
    facts: [
      { label: "Commissions / an", value: formatEuroWhole(Number(p.annualCommissions)) },
      { label: "Contrats", value: formatCount(p.contractCount) },
      {
        label: "Valorisation",
        value: p.valuations[0]
          ? formatEuroWhole(Number(p.valuations[0].midValue))
          : "Non calculée",
      },
    ],
    badge: p.valuations[0] ? undefined : { label: "À valoriser", tone: "attention" },
  }));

  const listingRows: SummaryRow[] = listings.map((l) => ({
    id: l.id,
    href: `/app/annonces/${l.id}`,
    title: `Portefeuille #${l.publicNumber}`,
    subtitle: l.portfolio.label,
    facts: [
      { label: "Prix demandé", value: formatEuroWhole(Number(l.askingPrice)) },
      { label: "Zone", value: l.displayedZone },
    ],
    badge: {
      label: LISTING_STATUS_LABELS[l.status],
      tone: l.status === "DRAFT" ? "attention" : "neutre",
    },
  }));

  const mandateRows: SummaryRow[] = mandates.map((m) => ({
    id: m.id,
    href: "/app/mandats",
    title: `Mandat jusqu’à ${formatEuroWhole(Number(m.maxBudget))}`,
    subtitle: asStringArray(m.zones).join(", ") || "Toutes zones",
    facts: [
      {
        label: "Commissions recherchées",
        value: `${formatEuroWhole(Number(m.minCommissions))} à ${formatEuroWhole(Number(m.maxCommissions))}`,
      },
      { label: "Correspondances", value: formatCount(m._count.matches) },
    ],
  }));

  const offerRows: SummaryRow[] = offers.map((o) => ({
    id: o.id,
    href: `/annonces/${o.listing.publicNumber}`,
    title: `Offre sur le portefeuille #${o.listing.publicNumber}`,
    facts: [
      { label: "Montant", value: formatEuroWhole(Number(o.amount)) },
      { label: "Comptant", value: `${Number(o.upfrontPercent).toLocaleString("fr-FR")} %` },
    ],
    badge: { label: OFFER_STATUS_LABELS[o.status], tone: "neutre" },
  }));

  const dealRows: SummaryRow[] = deals.map((d) => {
    const counterparty =
      d.seller.kind === "identified" && d.seller.id === actor.id ? d.buyer : d.seller;
    return {
      id: d.id,
      href: `/app/dossiers/${d.id}`,
      title: `Dossier sur le portefeuille #${d.listing.publicNumber}`,
      subtitle: `Contrepartie : ${counterpartyDisplayName(counterparty)}`,
      facts: [
        { label: "Prix convenu", value: formatEuroWhole(Number(d.agreedPrice)) },
      ],
      badge: {
        label: DEAL_STAGE_LABELS[d.stage],
        tone: d.stage === "CLOSED" ? "ok" : "attention",
      },
    };
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-[15px] text-muted">
        {ROLE_LABEL[actor.role]} · ORIAS {actor.oriasNumber} · alias {actor.publicAlias}
      </p>
      <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">
        Bonjour {actor.fullName?.split(" ")[0] ?? ""}
      </h1>

      <div className="mt-7">
        <NextActionBanner action={action} />
      </div>

      <section
        aria-label="Chiffres clés"
        className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-3xl border border-line bg-line"
      >
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-paper p-5">
            <p className="text-sm text-muted">{kpi.label}</p>
            <p className="tabular mt-1.5 font-serif text-xl font-semibold text-ink">{kpi.value}</p>
          </div>
        ))}
      </section>

      {seller ? (
        <div className="mt-12">
          <ReadinessPanel axes={axes} score={readinessScore(axes)} />
        </div>
      ) : null}

      {seller ? (
        <SummaryList
          title="Portefeuilles"
          action={{ href: "/app/import", label: "Importer" }}
          rows={portfolioRows}
          empty={{
            text: "Tout commence ici. Déposez un bordereau CSV ou XLSX : les colonnes nominatives sont refusées, et la valorisation se calcule aussitôt.",
            href: "/app/import",
            label: "Importer un bordereau",
          }}
        />
      ) : null}

      {seller ? (
        <SummaryList
          title="Annonces"
          action={{ href: "/app/annonces/nouvelle", label: "Nouvelle annonce" }}
          rows={listingRows}
          empty={{
            text: "Publiez un portefeuille sous alias pour recevoir des offres. Ni raison sociale, ni commune.",
            href: "/app/annonces/nouvelle",
            label: "Créer une annonce",
          }}
        />
      ) : null}

      {buyer ? (
        <SummaryList
          title="Mandats de recherche"
          action={{ href: "/app/mandats", label: "Nouveau mandat" }}
          rows={mandateRows}
          empty={{
            text: "Décrivez une fois ce que vous cherchez. Les dossiers correspondants vous seront présentés par score d’adéquation.",
            href: "/app/mandats",
            label: "Déposer un mandat",
          }}
        />
      ) : null}

      {buyer ? (
        <SummaryList
          title="Mes offres"
          rows={offerRows}
          empty={{
            text: "Les annonces dont la fenêtre est ouverte acceptent une proposition. Aucun autre candidat ne verra votre montant.",
            href: "/annonces",
            label: "Parcourir les annonces",
          }}
        />
      ) : null}

      <SummaryList
        title="Dossiers"
        rows={dealRows}
        empty={{
          text: "Un dossier s’ouvre lorsque vous retenez une offre, ou lorsqu’un cédant retient la vôtre.",
          href: "/annonces",
          label: "Voir les annonces",
        }}
      />
    </main>
  );
}
