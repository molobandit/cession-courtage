import "server-only";
import type { ToneName, ToolIconName } from "@/components/app/toolbox";
import {
  canBuy,
  canSell,
  counterpartyDisplayName,
  listMyDeals,
  listMyListings,
  listMyMandates,
} from "@/lib/authz";
import type { Actor } from "@/lib/authz/actor";
import { pipelineProgressPercent } from "@/lib/deal/pipeline";
import { formatEuroWhole } from "@/lib/format/number";
import { asStringArray } from "@/lib/json-array";
import { listMyProposalsAsSeller } from "@/lib/mandate/proposals";
import { listMyPositions, positionSnapshot } from "@/lib/position/load";
import { prisma } from "@/lib/prisma";
import {
  DEAL_STAGE_LABELS,
  LISTING_STATUS_LABELS,
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
  const [deals, listings, positions, mandates, propositions] = await Promise.all([
    listMyDeals(actor),
    seller ? listMyListings(actor) : Promise.resolve([]),
    buyer ? listMyPositions(actor.id) : Promise.resolve([]),
    buyer ? listMyMandates(actor) : Promise.resolve([]),
    seller ? listMyProposalsAsSeller(actor.id) : Promise.resolve([]),
  ]);

  const dealsVendeur = deals.filter((d) => d.sellerId === actor.id);
  const dealsAcheteur = deals.filter((d) => d.buyerId === actor.id);
  const numerosVendus = new Set(dealsVendeur.map((d) => d.listing.publicNumber));
  const suivis = await Promise.all(
    propositions.map((p) => positionSnapshot(p.listing.id, p.mandate.buyerId)),
  );
  // Nombre de candidats par annonce : c'est ce qu'un cédant veut voir d'abord.
  const candidatures = listings.length
    ? await prisma.buyerPosition.findMany({
        where: { listingId: { in: listings.map((l) => l.id) } },
        select: { listingId: true },
      })
    : [];
  const candidatsPar = new Map<string, number>();
  for (const c of candidatures) candidatsPar.set(c.listingId, (candidatsPar.get(c.listingId) ?? 0) + 1);
  const numerosSuivis = new Set(positions.map((p) => p.position.listing.publicNumber));

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
        href: candidatsPar.get(l.id) ? `/app/annonces/${l.id}/offres` : `/app/annonces/${l.id}`,
        ribbon: { label: LISTING_STATUS_LABELS[l.status], icon: "megaphone" as const },
        tone: "escrow" as const,
        title: `Dossier N° ${l.publicNumber}`,
        subtitle: l.portfolio.label,
        bullets: [
          { text: l.displayedZone },
          candidatsPar.get(l.id)
            ? { text: `${candidatsPar.get(l.id)} candidat${(candidatsPar.get(l.id) ?? 0) > 1 ? "s" : ""} en cours` }
            : { text: "Aucun candidat pour le moment", muted: true },
        ],
        amount: formatEuroWhole(Number(l.askingPrice)),
        active: l.status !== "WITHDRAWN" && l.status !== "SOLD",
      })),
    // Réponses du cédant aux demandes d'acquisition : ses positions vendeur.
    ...propositions.map((p, i) => {
      const suivi = suivis[i];
      const branches = asStringArray(p.mandate.riskTypes)
        .map((r) => RISK_TYPE_LABELS[r as keyof typeof RISK_TYPE_LABELS] ?? r)
        .join(", ");
      return {
        key: `proposal-${p.id}`,
        // Dès que l'acquéreur a pris position, la carte mène à son dossier et en suit l'avancement.
        href: suivi
          ? `/app/positions/${suivi.id}`
          : p.mandate.publicNumber
            ? `/annonces/demandes/${p.mandate.publicNumber}`
            : "/annonces/demandes",
        ribbon: { label: "Position Vendeur", icon: "user" as const },
        tone: "escrow" as const,
        title: `Demande N° ${p.mandate.publicNumber ?? "—"}`,
        subtitle: `Acquéreur : ${p.mandate.buyer.publicAlias} · ${suivi ? suivi.state.title : "proposition envoyée"}`,
        percent: suivi ? suivi.state.percent : 1,
        bullets: [
          branches ? { text: branches } : { text: "Toutes branches", muted: true },
          { text: `Portefeuille n° ${p.listing.publicNumber} proposé` },
        ],
        amount: `Budget : ${formatEuroWhole(Number(p.mandate.maxBudget))}`,
        active: p.listing.status !== "SOLD" && p.listing.status !== "WITHDRAWN",
      };
    }),
  ];

  /*
   * Côté achat, un dossier par prise de position, de la position à la clôture :
   * c'est la même carte qui avance, au lieu d'une offre qui disparaît au profit
   * d'un dossier de cession.
   */
  const achats: DossierItem[] = [
    ...positions.map(({ position, state, deal }) => ({
      key: `position-${position.id}`,
      href: `/app/positions/${position.id}`,
      ribbon: { label: "Position Acheteur", icon: "user" as const },
      tone: "listing" as const,
      title: `Dossier N° ${position.listing.publicNumber}`,
      subtitle: state.title,
      percent: state.percent,
      bullets: [
        { text: position.listing.displayedZone },
        { text: `Commissions : ${formatEuroWhole(Number(position.listing.portfolio.annualCommissions))} / an` },
      ],
      amount: formatEuroWhole(Number(deal ? deal.agreedPrice : position.listing.askingPrice)),
      active: state.outcome === "active",
    })),
    // Filet de sécurité : un dossier ouvert avant l'existence des positions.
    ...dealsAcheteur
      .filter((d) => !numerosSuivis.has(d.listing.publicNumber))
      .map((d) => ({
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
