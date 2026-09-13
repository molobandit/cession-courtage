import "server-only";
import type { ToneName, ToolIconName } from "@/components/app/toolbox";
import {
  canBuy,
  canSell,
  counterpartyDisplayName,
  listMyDeals,
  listMyListings,
  listMyMandates,
  listMyOffers,
} from "@/lib/authz";
import type { Actor } from "@/lib/authz/actor";
import { pipelineProgressPercent } from "@/lib/deal/pipeline";
import { formatEuroWhole } from "@/lib/format/number";
import { asStringArray } from "@/lib/json-array";
import { listMyProposalsAsSeller } from "@/lib/mandate/proposals";
import {
  DEAL_STAGE_LABELS,
  LISTING_STATUS_LABELS,
  OFFER_STATUS_LABELS,
  RISK_TYPE_LABELS,
} from "@/lib/labels";

export type DossierItem = {
  key: string;
  href: string;
  ribbon: { label: string; icon: ToolIconName };
  tone: ToneName;
  title: string;
  subtitle?: string;
  percent?: number;
  bullets: { text: string; muted?: boolean }[];
  amount: string;
  active: boolean;
};

/**
 * Cessions et achats du parcours intermédié, prêts à afficher en cartes.
 *
 * Un dossier engagé prime sur l'annonce ou l'offre qui l'a fait naître : on ne
 * montre pas deux fois la même cession, une fois comme annonce et une fois
 * comme projet.
 */
export async function loadMemberDossiers(actor: Actor) {
  const seller = canSell(actor);
  const buyer = canBuy(actor);
  const [deals, listings, offers, mandates, propositions] = await Promise.all([
    listMyDeals(actor),
    seller ? listMyListings(actor) : Promise.resolve([]),
    buyer ? listMyOffers(actor) : Promise.resolve([]),
    buyer ? listMyMandates(actor) : Promise.resolve([]),
    seller ? listMyProposalsAsSeller(actor.id) : Promise.resolve([]),
  ]);

  const dealsVendeur = deals.filter((d) => d.sellerId === actor.id);
  const dealsAcheteur = deals.filter((d) => d.buyerId === actor.id);
  const numerosVendus = new Set(dealsVendeur.map((d) => d.listing.publicNumber));
  const numerosAchetes = new Set(dealsAcheteur.map((d) => d.listing.publicNumber));

  const cessions: DossierItem[] = [
    ...dealsVendeur.map((d) => ({
      key: `deal-${d.id}`,
      href: `/app/dossiers/${d.id}`,
      ribbon: { label: "Vente intermédiée", icon: "briefcase" as const },
      tone: "kit" as const,
      title: `N° ${d.listing.publicNumber}, Dossier de vente`,
      subtitle: `Acquéreur : ${counterpartyDisplayName(d.buyer)}`,
      percent: pipelineProgressPercent(d.stage),
      bullets: [{ text: d.listing.displayedZone }, { text: DEAL_STAGE_LABELS[d.stage] }],
      amount: formatEuroWhole(Number(d.agreedPrice)),
      active: d.stage !== "CLOSED",
    })),
    ...listings
      .filter((l) => !numerosVendus.has(l.publicNumber))
      .map((l) => ({
        key: `listing-${l.id}`,
        href: `/app/annonces/${l.id}`,
        ribbon: { label: LISTING_STATUS_LABELS[l.status], icon: "megaphone" as const },
        tone: "escrow" as const,
        title: `Dossier N° ${l.publicNumber}`,
        subtitle: l.portfolio.label,
        bullets: [
          { text: l.displayedZone },
          { text: `Commissions : ${formatEuroWhole(Number(l.portfolio.annualCommissions))} / an` },
        ],
        amount: formatEuroWhole(Number(l.askingPrice)),
        active: l.status !== "WITHDRAWN" && l.status !== "SOLD",
      })),
    // Réponses du cédant aux demandes d'acquisition : ses positions vendeur.
    ...propositions.map((p) => {
      const branches = asStringArray(p.mandate.riskTypes)
        .map((r) => RISK_TYPE_LABELS[r as keyof typeof RISK_TYPE_LABELS] ?? r)
        .join(", ");
      return {
        key: `proposal-${p.id}`,
        href: p.mandate.publicNumber ? `/annonces/demandes/${p.mandate.publicNumber}` : "/annonces/demandes",
        ribbon: { label: "Position Vendeur", icon: "user" as const },
        tone: "escrow" as const,
        title: `Demande N° ${p.mandate.publicNumber ?? "—"}`,
        subtitle: `Acquéreur : ${p.mandate.buyer.publicAlias}`,
        bullets: [
          branches ? { text: branches } : { text: "Toutes branches", muted: true },
          { text: `Portefeuille n° ${p.listing.publicNumber} proposé` },
        ],
        amount: `Budget : ${formatEuroWhole(Number(p.mandate.maxBudget))}`,
        active: p.listing.status !== "SOLD" && p.listing.status !== "WITHDRAWN",
      };
    }),
  ];

  const achats: DossierItem[] = [
    ...dealsAcheteur.map((d) => ({
      key: `deal-${d.id}`,
      href: `/app/dossiers/${d.id}`,
      ribbon: { label: "Position Acheteur", icon: "user" as const },
      tone: "listing" as const,
      title: `Dossier N° ${d.listing.publicNumber}`,
      subtitle: `Cédant : ${counterpartyDisplayName(d.seller)}`,
      percent: pipelineProgressPercent(d.stage),
      bullets: [{ text: d.listing.displayedZone }, { text: DEAL_STAGE_LABELS[d.stage] }],
      amount: formatEuroWhole(Number(d.agreedPrice)),
      active: d.stage !== "CLOSED",
    })),
    ...offers
      .filter((o) => !numerosAchetes.has(o.listing.publicNumber))
      .map((o) => ({
        key: `offer-${o.id}`,
        href: `/annonces/${o.listing.publicNumber}`,
        ribbon: { label: "Position Acheteur", icon: "user" as const },
        tone: "listing" as const,
        title: `Dossier N° ${o.listing.publicNumber}`,
        subtitle: `Offre : ${OFFER_STATUS_LABELS[o.status].toLowerCase()}`,
        bullets: [{ text: o.listing.displayedZone }, { text: `Prix demandé : ${formatEuroWhole(Number(o.listing.askingPrice))}` }],
        amount: formatEuroWhole(Number(o.amount)),
        active: o.status !== "DECLINED" && o.status !== "WITHDRAWN",
      })),
    ...mandates.map((m) => {
      const zones = asStringArray(m.zones);
      const branches = asStringArray(m.riskTypes)
        .map((r) => RISK_TYPE_LABELS[r as keyof typeof RISK_TYPE_LABELS] ?? r)
        .join(", ");
      return {
        key: `mandate-${m.id}`,
        href: m.isPublic && m.publicNumber ? `/annonces/demandes/${m.publicNumber}` : "/app/mandats",
        ribbon: { label: "Annonce d’achat", icon: "cart" as const },
        tone: "wanted" as const,
        title: m.publicNumber ? `Dossier N° ${m.publicNumber}` : "Annonce d’achat",
        subtitle: `${m._count.proposals} proposition${m._count.proposals > 1 ? "s" : ""} · ${m._count.matches} correspondance${m._count.matches > 1 ? "s" : ""}`,
        bullets: [
          branches ? { text: branches } : { text: "Toutes branches", muted: true },
          {
            text: zones.includes("NATIONAL")
              ? "France entière"
              : zones.join(", ") || "Zone non précisée",
          },
        ],
        amount: `Budget : ${formatEuroWhole(Number(m.maxBudget))}`,
        active: m.isActive,
      };
    }),
  ];

  return { seller, buyer, cessions, achats };
}
