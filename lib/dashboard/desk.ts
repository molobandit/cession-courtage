import "server-only";
import type { PositionRow, TodoItem } from "@/components/app/desk";
import { canBuy, canSell, listMyDeals, listMyListings, listMyMandates } from "@/lib/authz";
import type { Actor } from "@/lib/authz/actor";
import { isOfferWindowSealed } from "@/lib/authz/policies";
import { SALE_PIPELINE, nextPipelineAction, pipelineProgressPercent } from "@/lib/deal/pipeline";
import { listMyDirectDeals } from "@/lib/direct/load";
import { stepByKey, type DirectStage } from "@/lib/direct/stages";
import { formatEuroWhole } from "@/lib/format/number";
import { marketStatus } from "@/lib/listing/market-status";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import { listMyProposalsAsSeller } from "@/lib/mandate/proposals";
import { formatMultiple, listingMultiple, marketIndices, quoteBoard } from "@/lib/market/indices";
import { listListingPositions, listMyPositions, positionSnapshot } from "@/lib/position/load";
import { prisma } from "@/lib/prisma";

/**
 * Tout ce que le poste de marché affiche, chargé en une fois.
 *
 * Le tableau de bord répond à trois questions, dans cet ordre : que se passe-t-il
 * sur le marché, qu'est-ce qui m'attend, où en sont mes positions. Chaque ligne
 * mène à l'écran où l'on agit.
 */
export async function loadDesk(actor: Actor) {
  const vendeur = canSell(actor);
  const acheteur = canBuy(actor);

  const [cartes, positions, annonces, deals, mandats, propositions, directs, nonLues] = await Promise.all([
    loadPublicListingCards(),
    acheteur ? listMyPositions(actor.id) : Promise.resolve([]),
    vendeur ? listMyListings(actor) : Promise.resolve([]),
    listMyDeals(actor),
    acheteur ? listMyMandates(actor) : Promise.resolve([]),
    vendeur ? listMyProposalsAsSeller(actor.id) : Promise.resolve([]),
    listMyDirectDeals(actor.id, actor.email),
    prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
  ]);

  const indices = marketIndices(cartes);
  const cote = quoteBoard(cartes, 6);
  const bandeau = cartes.filter((c) => c.marketTone === "open" || c.marketTone === "sealed").slice(0, 16);

  const [candidatsParAnnonce, suivisPropositions] = await Promise.all([
    Promise.all(annonces.map(async (a) => [a.id, await listListingPositions(a.id)] as const)),
    Promise.all(propositions.map((p) => positionSnapshot(p.listing.id, p.mandate.buyerId))),
  ]);
  const candidats = new Map(candidatsParAnnonce);
  const dealsVendeur = deals.filter((d) => d.sellerId === actor.id);

  const aFaire: TodoItem[] = [];
  const lignes: PositionRow[] = [];

  // Achats : une ligne par position.
  for (const { position, state, deal, offer } of positions) {
    const l = position.listing;
    const multiple = formatMultiple(listingMultiple(Number(l.askingPrice), Number(l.portfolio.annualCommissions)));
    const href = `/app/positions/${position.id}`;
    lignes.push({
      key: `pos-${position.id}`,
      href,
      side: "Achat",
      numero: String(l.publicNumber),
      libelle: l.portfolio.label,
      etape: state.title,
      percent: state.percent,
      montant: formatEuroWhole(Number(deal?.agreedPrice ?? offer?.amount ?? l.askingPrice)),
      multiple,
      issue: state.outcome,
    });
    if (state.outcome !== "active") continue;
    if (state.key === "POSITION") {
      aFaire.push({ key: `t-${position.id}`, href, icon: "shield", title: `Verser le dépôt de garantie · N° ${l.publicNumber}`, detail: "Il ouvre les coordonnées du cédant et vous permet de faire une offre.", cta: "Verser" });
    } else if (state.key === "DEPOSIT") {
      aFaire.push({ key: `t-${position.id}`, href, icon: "megaphone", title: `Déposer votre offre · N° ${l.publicNumber}`, detail: `Prix demandé ${formatEuroWhole(Number(l.askingPrice))} · ${multiple}`, cta: "Faire une offre", urgent: true });
    } else if (deal && deal.stage !== "CLOSED") {
      const suite = nextPipelineAction(deal.stage, "buyer");
      aFaire.push({ key: `t-${position.id}`, href: `/app/dossiers/${deal.id}`, icon: "briefcase", title: `${suite.title} · N° ${l.publicNumber}`, detail: suite.body, cta: "Avancer", urgent: deal.stage === "DATA_ROOM" || deal.stage === "SIGNATURE" });
    }
  }

  // Ventes : une ligne par annonce, avec son dossier le plus avancé ou ses candidats.
  for (const annonce of annonces) {
    const cotation = marketStatus({ status: annonce.status, offerWindowClosesAt: annonce.offerWindowClosesAt });
    const multiple = formatMultiple(listingMultiple(Number(annonce.askingPrice), Number(annonce.portfolio.annualCommissions)));
    const dossiers = dealsVendeur.filter((d) => d.listing.publicNumber === annonce.publicNumber);
    const plusAvance = [...dossiers].sort((a, b) => pipelineProgressPercent(b.stage) - pipelineProgressPercent(a.stage))[0];
    const liste = candidats.get(annonce.id) ?? [];
    const scelle = isOfferWindowSealed(annonce);

    if (plusAvance) {
      const etape = SALE_PIPELINE.find((s) => s.key === plusAvance.stage)?.label ?? plusAvance.stage;
      lignes.push({
        key: `vente-${annonce.id}`,
        href: `/app/dossiers/${plusAvance.id}`,
        side: "Vente",
        numero: String(annonce.publicNumber),
        libelle: annonce.portfolio.label,
        etape: plusAvance.stage === "CLOSED" ? "Cession close" : etape,
        percent: pipelineProgressPercent(plusAvance.stage),
        montant: formatEuroWhole(Number(plusAvance.agreedPrice)),
        multiple,
        issue: plusAvance.stage === "CLOSED" ? "closed" : "active",
      });
      if (plusAvance.stage !== "CLOSED") {
        const suite = nextPipelineAction(plusAvance.stage, "seller");
        aFaire.push({ key: `t-deal-${plusAvance.id}`, href: `/app/dossiers/${plusAvance.id}`, icon: "briefcase", title: `${suite.title} · N° ${annonce.publicNumber}`, detail: suite.body, cta: "Avancer" });
      }
      continue;
    }

    const offres = liste.filter((c) => c.state.key === "OFFER");
    lignes.push({
      key: `vente-${annonce.id}`,
      href: liste.length ? `/app/annonces/${annonce.id}/offres` : `/app/annonces/${annonce.id}`,
      side: "Vente",
      numero: String(annonce.publicNumber),
      libelle: annonce.portfolio.label,
      etape:
        annonce.status === "DRAFT"
          ? "Brouillon, non publié"
          : `${cotation.label} · ${liste.length} candidat${liste.length > 1 ? "s" : ""}${offres.length ? ` · ${offres.length} offre${offres.length > 1 ? "s" : ""}` : ""}`,
      percent: liste.length ? Math.max(...liste.map((c) => c.state.percent)) : null,
      montant: formatEuroWhole(Number(annonce.askingPrice)),
      multiple,
      issue: "active",
    });
    if (annonce.status === "DRAFT") {
      aFaire.push({ key: `t-draft-${annonce.id}`, href: `/app/annonces/${annonce.id}`, icon: "megaphone", title: `Publier l’annonce · N° ${annonce.publicNumber}`, detail: "Tant qu’elle est en brouillon, aucun acquéreur ne la voit.", cta: "Publier" });
    } else if (offres.length && !scelle) {
      const meilleure = Math.max(...offres.map((o) => Number(o.offer?.amount ?? 0)));
      aFaire.push({ key: `t-offres-${annonce.id}`, href: `/app/annonces/${annonce.id}/offres`, icon: "megaphone", title: `${offres.length} offre${offres.length > 1 ? "s" : ""} à examiner · N° ${annonce.publicNumber}`, detail: `Meilleure offre ${formatEuroWhole(meilleure)} pour ${formatEuroWhole(Number(annonce.askingPrice))} demandés`, cta: "Comparer", urgent: true });
    }
  }

  // Réponses du cédant aux demandes d'acquisition.
  propositions.forEach((p, i) => {
    const suivi = suivisPropositions[i];
    lignes.push({
      key: `prop-${p.id}`,
      href: suivi ? `/app/positions/${suivi.id}` : `/annonces/demandes/${p.mandate.publicNumber}`,
      side: "Vente",
      numero: String(p.listing.publicNumber),
      libelle: `Proposé sur la demande n° ${p.mandate.publicNumber} (${p.mandate.buyer.publicAlias})`,
      etape: suivi ? suivi.state.title : "Proposition envoyée",
      percent: suivi ? suivi.state.percent : 1,
      montant: `Budget ${formatEuroWhole(Number(p.mandate.maxBudget))}`,
      multiple: "—",
      issue: suivi ? suivi.state.outcome : "active",
    });
  });

  // Demandes d'acquisition de l'acquéreur.
  for (const m of mandats) {
    lignes.push({
      key: `mandat-${m.id}`,
      href: m.isPublic && m.publicNumber ? `/annonces/demandes/${m.publicNumber}` : "/app/mandats",
      side: "Demande",
      numero: m.publicNumber ? String(m.publicNumber) : "—",
      libelle: `Budget jusqu’à ${formatEuroWhole(Number(m.maxBudget))}`,
      etape: `${m._count.proposals} proposition${m._count.proposals > 1 ? "s" : ""} · ${m._count.matches} correspondance${m._count.matches > 1 ? "s" : ""}`,
      percent: null,
      montant: formatEuroWhole(Number(m.maxBudget)),
      multiple: "—",
    });
  }

  // Services à la carte en cours.
  for (const d of directs.filter((x) => x.stage !== "CLOSED")) {
    const etape = stepByKey(d.stage as DirectStage);
    aFaire.push({ key: `t-direct-${d.id}`, href: `/app/formaliser/${d.id}`, icon: "clipboard", title: `${d.portfolioLabel}`, detail: `Service à la carte · étape « ${etape.label} »`, cta: "Ouvrir" });
  }

  const ordre = { active: 0, closed: 1, withdrawn: 2, lost: 3 } as const;
  lignes.sort((a, b) => ordre[a.issue ?? "active"] - ordre[b.issue ?? "active"]);
  aFaire.sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)));

  const positionsOuvertes = lignes.filter((l) => l.side !== "Demande" && (l.issue ?? "active") === "active").length;
  const offresEnAttente =
    positions.filter((p) => p.state.key === "OFFER").length +
    [...candidats.values()].flat().filter((c) => c.state.key === "OFFER").length;

  return {
    vendeur,
    acheteur,
    indices,
    cote,
    bandeau,
    aFaire: aFaire.slice(0, 6),
    lignes,
    enAttenteDuCedant: positions.filter((p) => p.state.key === "OFFER").length,
    compteurs: {
      positionsOuvertes,
      offresEnAttente,
      annoncesEnSeance: annonces.filter((a) => a.status === "OFFERS_OPEN" || a.status === "OFFERS_CLOSED" || a.status === "PUBLISHED").length,
      nonLues,
    },
    directs,
  };
}
