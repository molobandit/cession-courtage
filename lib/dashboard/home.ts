import "server-only";
import type { DealStage, ListingStatus } from "@prisma/client";
import { canBuy, canSell, listMyListings, listMyPortfolios } from "@/lib/authz";
import type { Actor } from "@/lib/authz/actor";
import { SALE_PIPELINE, type PipelineStep } from "@/lib/deal/pipeline";
import { nextAction, type DashboardState, type NextAction } from "@/lib/dashboard/next-action";
import { secondFacteurActif } from "@/lib/auth/second-facteur";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import { listMyPositions } from "@/lib/position/load";
import { prisma } from "@/lib/prisma";

/**
 * Tout ce que l'accueil de l'espace membre affiche, chargé en une fois.
 *
 * L'écran répond à deux questions, dans cet ordre : que dois-je faire
 * maintenant, et où en sont mes dossiers. Les ventes et les achats se lisent
 * sur les quatre mêmes étapes que le dossier de présentation, pour qu'un
 * dossier n'ait jamais deux lectures selon l'écran.
 */

/** Qui doit agir à cette étape. Dit en clair, jamais deviné par le lecteur. */
export type Acteur = "À vous" | "À notre équipe" | "Aux acquéreurs" | "Au cédant";

export type VenteParEtape = {
  step: PipelineStep;
  count: number;
  /** Précision courte, par exemple « 2 en ligne ». */
  detail: string | null;
  acteur: Acteur | null;
};

export type LigneAchat = {
  positionId: string;
  numero: number;
  libelle: string;
  /** Index de l'étape courante, de 0 à 3. */
  index: number;
  etape: string;
  acteur: Acteur | null;
  montant: number;
};

export type HomeData = {
  prenom: string | null;
  /** Double authentification déjà activée : on ne la propose qu'une fois. */
  deuxFacteurs: boolean;
  vendeur: boolean;
  acheteur: boolean;
  action: NextAction;
  ventes: VenteParEtape[];
  ventesTotal: number;
  achats: LigneAchat[];
  marche: { total: number; certifies: number };
};

const EN_LIGNE: ListingStatus[] = ["PUBLISHED", "OFFERS_OPEN", "OFFERS_CLOSED"];
const A_ETUDIER: ListingStatus[] = ["DRAFT", "PENDING_REVIEW"];

/** Qui doit agir sur un dossier de cession, vu du cédant. */
function acteurVendeur(stage: DealStage): Acteur | null {
  if (stage === "CLOSED") return null;
  if (stage === "ESCROW" || stage === "TRANSFER" || stage === "RETENTION") return "À notre équipe";
  return "À vous";
}

/** Qui doit agir sur un dossier de cession, vu de l'acquéreur. */
function acteurAcheteur(stage: DealStage | null, hasDeposit: boolean): Acteur | null {
  if (!stage) return hasDeposit ? "À notre équipe" : "À vous";
  if (stage === "CLOSED") return null;
  if (stage === "ESCROW" || stage === "TRANSFER") return "À vous";
  return "Au cédant";
}

export async function loadHome(actor: Actor): Promise<HomeData> {
  const vendeur = canSell(actor);
  const acheteur = canBuy(actor);

  const [annonces, dossiers, positions, portefeuilles, cartes, deuxFacteurs] = await Promise.all([
    vendeur ? listMyListings(actor) : Promise.resolve([]),
    prisma.deal.findMany({
      where: { OR: [{ sellerId: actor.id }, { buyerId: actor.id }] },
      orderBy: { createdAt: "desc" },
      select: { id: true, stage: true, listingId: true, sellerId: true },
    }),
    acheteur ? listMyPositions(actor.id) : Promise.resolve([]),
    vendeur ? listMyPortfolios(actor) : Promise.resolve([]),
    loadPublicListingCards(),
    secondFacteurActif(actor.id),
  ]);

  const dossiersParAnnonce = new Map(dossiers.map((d) => [d.listingId, d] as const));
  const positionsParAnnonce = vendeur
    ? await prisma.buyerPosition.groupBy({
        by: ["listingId"],
        where: { listingId: { in: annonces.map((a) => a.id) } },
        _count: { _all: true },
      })
    : [];
  const positionsConnues = new Map(positionsParAnnonce.map((p) => [p.listingId, p._count._all] as const));

  // Chaque annonce compte une seule fois, à l'étape la plus avancée qu'elle a atteinte.
  const parEtape = [0, 0, 0, 0];
  const acteurs: (Acteur | null)[] = [null, null, null, null];
  let aEtudier = 0;
  let enLigne = 0;

  for (const annonce of annonces) {
    const dossier = dossiersParAnnonce.get(annonce.id);
    if (dossier && dossier.stage !== "CLOSED") {
      parEtape[3] += 1;
      acteurs[3] = acteurVendeur(dossier.stage);
      continue;
    }
    if (dossier || annonce.status === "SOLD") continue;
    if ((positionsConnues.get(annonce.id) ?? 0) > 0) {
      parEtape[2] += 1;
      acteurs[2] = "Aux acquéreurs";
      continue;
    }
    if (EN_LIGNE.includes(annonce.status)) {
      parEtape[1] += 1;
      acteurs[1] = "Aux acquéreurs";
      enLigne += 1;
      continue;
    }
    if (A_ETUDIER.includes(annonce.status)) {
      parEtape[0] += 1;
      acteurs[0] = annonce.status === "DRAFT" ? "À vous" : "À notre équipe";
      aEtudier += 1;
    }
  }

  const ventes: VenteParEtape[] = SALE_PIPELINE.map((step, index) => ({
    step,
    count: parEtape[index] ?? 0,
    detail:
      index === 0 && aEtudier > 0
        ? `${aEtudier} portefeuille${aEtudier > 1 ? "s" : ""}`
        : index === 1 && enLigne > 0
          ? `${enLigne} annonce${enLigne > 1 ? "s" : ""}`
          : null,
    acteur: acteurs[index] ?? null,
  }));

  const achats: LigneAchat[] = positions.map(({ position, state, deal }) => ({
    positionId: position.id,
    numero: position.listing.publicNumber ?? 0,
    libelle: position.listing.portfolio.label,
    index: state.outcome === "lost" || state.outcome === "withdrawn" ? -1 : deal ? 3 : 2,
    etape: state.title,
    acteur: acteurAcheteur(deal?.stage ?? null, state.key !== "POSITION"),
    montant: Number(position.listing.askingPrice),
  }));

  const brouillon = annonces.find((a) => a.status === "DRAFT");
  const dossierActif = dossiers.find((d) => d.stage !== "CLOSED");
  const aFinancer = positions.find(({ state }) => state.key === "POSITION" && state.outcome === "active");
  const sansEtude = portefeuilles.find((p) => p.valuations.length === 0);

  const etat: DashboardState = {
    canSell: vendeur,
    canBuy: acheteur,
    portfolioCount: portefeuilles.length,
    unvaluedPortfolioCount: portefeuilles.filter((p) => p.valuations.length === 0).length,
    draftListing:
      brouillon && brouillon.publicNumber !== null
        ? { publicNumber: brouillon.publicNumber, id: brouillon.id }
        : null,
    retentionDeal: null,
    activeDeal: dossierActif ? { id: dossierActif.id } : null,
    unvaluedPortfolio: sansEtude ? { id: sansEtude.id } : null,
    positionToFund: aFinancer
      ? { id: aFinancer.position.id, publicNumber: aFinancer.position.listing.publicNumber ?? 0 }
      : null,
    activeDealCount: dossiers.filter((d) => d.stage !== "CLOSED").length,
    retentionDue: 0,
  };

  return {
    prenom: actor.fullName?.split(" ")[0] ?? null,
    deuxFacteurs,
    vendeur,
    acheteur,
    action: nextAction(etat),
    ventes,
    ventesTotal: parEtape.reduce((somme, n) => somme + n, 0),
    achats,
    marche: { total: cartes.length, certifies: cartes.filter((c) => c.certified).length },
  };
}
