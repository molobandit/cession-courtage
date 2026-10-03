import "server-only";
import type { PositionRow } from "@/components/app/desk";
import { canBuy, canSell, listMyDeals, listMyListings, listMyMandates } from "@/lib/authz";
import type { Actor } from "@/lib/authz/actor";
import { SALE_PIPELINE, pipelineProgressPercent } from "@/lib/deal/pipeline";
import { formatEuroWhole } from "@/lib/format/number";
import { marketStatus } from "@/lib/listing/market-status";
import { commissionsCedees, listingLotTotals } from "@/lib/listing/lot-totals";
import { listMyProposalsAsSeller } from "@/lib/mandate/proposals";
import { formatMultiple, listingMultiple } from "@/lib/market/indices";
import { listListingPositions, listMyPositions, positionSnapshot } from "@/lib/position/load";

/**
 * Le carnet de positions d'un membre, chargé en une fois.
 *
 * Une ligne par dossier, dans le sens où on l'a pris : un achat, une vente, une
 * demande d'acquisition. Chaque ligne mène à l'écran où l'on agit. Ce qu'il
 * reste à faire, lui, se lit sur le tableau de bord.
 */
export async function loadDesk(actor: Actor) {
  const vendeur = canSell(actor);
  const acheteur = canBuy(actor);

  const [positions, annonces, deals, mandats, propositions] = await Promise.all([
    acheteur ? listMyPositions(actor.id) : Promise.resolve([]),
    vendeur ? listMyListings(actor) : Promise.resolve([]),
    listMyDeals(actor),
    acheteur ? listMyMandates(actor) : Promise.resolve([]),
    vendeur ? listMyProposalsAsSeller(actor.id) : Promise.resolve([]),
  ]);

  const [candidatsParAnnonce, suivisPropositions] = await Promise.all([
    Promise.all(annonces.map(async (a) => [a.id, await listListingPositions(a.id)] as const)),
    Promise.all(propositions.map((p) => positionSnapshot(p.listing.id, p.mandate.buyerId))),
  ]);
  const candidats = new Map(candidatsParAnnonce);
  const lots = await listingLotTotals([
    ...positions.map((p) => p.position.listing).filter((l) => l.isPartial).map((l) => l.id),
    ...annonces.filter((a) => a.isPartial).map((a) => a.id),
  ]);
  const dealsVendeur = deals.filter((d) => d.sellerId === actor.id);

  const lignes: PositionRow[] = [];

  // Achats : une ligne par position.
  for (const { position, state, deal, offer } of positions) {
    const l = position.listing;
    lignes.push({
      key: `pos-${position.id}`,
      href: `/app/positions/${position.id}`,
      side: "Achat",
      numero: String(l.publicNumber),
      libelle: l.portfolio.label,
      etape: state.title,
      percent: state.percent,
      montant: formatEuroWhole(Number(deal?.agreedPrice ?? offer?.amount ?? l.askingPrice)),
      multiple: formatMultiple(listingMultiple(Number(l.askingPrice), commissionsCedees(l, lots))),
      issue: state.outcome,
    });
  }

  // Ventes : une ligne par annonce, avec son dossier le plus avancé ou ses candidats.
  for (const annonce of annonces) {
    const cotation = marketStatus({ status: annonce.status });
    // Avant la mise en ligne, le prix n'est pas encore fixé par l'équipe : on ne l'affiche pas.
    const prixFixe = annonce.publishedAt !== null;
    const multiple = prixFixe ? formatMultiple(listingMultiple(Number(annonce.askingPrice), commissionsCedees(annonce, lots))) : "";
    const dossiers = dealsVendeur.filter((d) => d.listing.publicNumber === annonce.publicNumber);
    const plusAvance = [...dossiers].sort((a, b) => pipelineProgressPercent(b.stage) - pipelineProgressPercent(a.stage))[0];
    const liste = candidats.get(annonce.id) ?? [];

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
      continue;
    }

    // Positionnés : ceux qui ont versé leur dépôt, pas ceux qui regardent.
    const positionnes = liste.filter((c) => c.state.key !== "POSITION" && c.state.outcome === "active");
    lignes.push({
      key: `vente-${annonce.id}`,
      href: `/app/annonces/${annonce.id}`,
      side: "Vente",
      numero: String(annonce.publicNumber),
      libelle: annonce.portfolio.label,
      etape:
        annonce.status === "DRAFT"
          ? "Dossier à soumettre"
          : `${cotation.label} · ${liste.length} candidat${liste.length > 1 ? "s" : ""}${positionnes.length ? ` · ${positionnes.length} positionné${positionnes.length > 1 ? "s" : ""}` : ""}`,
      percent: liste.length ? Math.max(...liste.map((c) => c.state.percent)) : null,
      montant: prixFixe ? formatEuroWhole(Number(annonce.askingPrice)) : "Montant à venir",
      multiple,
      issue: "active",
    });
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
      multiple: "",
      issue: suivi ? suivi.state.outcome : "active",
    });
  });

  // Demandes d'acquisition de l'acquéreur.
  for (const m of mandats) {
    lignes.push({
      key: `mandat-${m.id}`,
      href: m.isPublic && m.publicNumber ? `/annonces/demandes/${m.publicNumber}` : "/app/mandats",
      side: "Demande",
      numero: m.publicNumber ? String(m.publicNumber) : "",
      libelle: `Budget jusqu’à ${formatEuroWhole(Number(m.maxBudget))}`,
      etape: `${m._count.proposals} proposition${m._count.proposals > 1 ? "s" : ""} · ${m._count.matches} correspondance${m._count.matches > 1 ? "s" : ""}`,
      percent: null,
      montant: formatEuroWhole(Number(m.maxBudget)),
      multiple: "",
    });
  }

  const ordre = { active: 0, closed: 1, withdrawn: 2, lost: 3 } as const;
  lignes.sort((a, b) => ordre[a.issue ?? "active"] - ordre[b.issue ?? "active"]);

  return { vendeur, acheteur, lignes };
}
