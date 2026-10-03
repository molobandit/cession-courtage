import "server-only";
import type { DealStage, ListingStatus } from "@prisma/client";
import { canBuy, canSell, listMyListings, listMyPortfolios } from "@/lib/authz";
import type { Actor } from "@/lib/authz/actor";
import { SALE_PIPELINE } from "@/lib/deal/pipeline";
import { nextAction, type DashboardState, type NextAction } from "@/lib/dashboard/next-action";
import { secondFacteurActif } from "@/lib/auth/second-facteur";
import { interestDepositFor } from "@/lib/billing/rates";
import { loadPublicListingCards } from "@/lib/listing/load-public-cards";
import { listListingPositions, listMyPositions } from "@/lib/position/load";
import { prisma } from "@/lib/prisma";

/**
 * Tout ce que l'accueil de l'espace membre affiche, chargé en une fois.
 *
 * L'écran répond à deux questions, dans cet ordre : où en sont mes affaires,
 * et que dois-je faire maintenant. Les ventes et les achats se lisent sur les
 * quatre mêmes étapes que le dossier de présentation, pour qu'un dossier n'ait
 * jamais deux lectures selon l'écran.
 */

/** Qui doit agir à cette étape. Dit en clair, jamais deviné par le lecteur. */
export type Acteur = "À vous" | "À notre équipe" | "Aux acquéreurs" | "Au cédant";

/** Une ligne de dossier, dans les blocs « Mes ventes » et « Mes achats ». */
export type DossierLigne = {
  key: string;
  href: string;
  /** Numéro de dossier, ou le nom du portefeuille tant qu'il n'en a pas. */
  titre: string;
  /** Branche et zone, dans cet ordre. */
  libelle: string;
  /** Index de l'étape courante, de 0 à 3. Négatif si le dossier est clos. */
  index: number;
  etape: string;
  detail: string | null;
  acteur: Acteur | null;
  clos: boolean;
};

/** Un acquéreur positionné sur l'une de mes annonces. */
export type PositionRecue = {
  key: string;
  href: string;
  numero: number;
  alias: string;
  detail: string;
  acteur: Acteur;
};

export type Tuile = { valeur: number; libelle: string; detail: string | null };

export type HomeData = {
  prenom: string | null;
  /** Double authentification déjà activée : on ne la propose qu'une fois. */
  deuxFacteurs: boolean;
  vendeur: boolean;
  acheteur: boolean;
  abonnement: { actif: boolean; jusquau: Date | null };
  action: NextAction;
  tuiles: Tuile[];
  ventes: DossierLigne[];
  achats: DossierLigne[];
  recues: PositionRecue[];
  marche: {
    total: number;
    certifies: number;
    nouveaux: number;
    dernier: { numero: number; commissions: number; montant: number } | null;
  };
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

/** « Retraite, Paris » : la branche puis la zone, sans répéter l'une dans l'autre. */
function brancheEtZone(label: string, zone: string | null): string {
  const z = (zone ?? "").trim();
  if (!z || label.toLocaleLowerCase("fr-FR").includes(z.toLocaleLowerCase("fr-FR"))) return label;
  return `${label}, ${z}`;
}

export async function loadHome(actor: Actor): Promise<HomeData> {
  const vendeur = canSell(actor);
  const acheteur = canBuy(actor);
  const depuisUneSemaine = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [annonces, dossiers, positions, portefeuilles, cartes, deuxFacteurs, abonnement, messages, nouveaux] =
    await Promise.all([
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
      prisma.subscription.findFirst({
        where: { userId: actor.id, status: "ACTIVE", plan: "GROWTH" },
        select: { renewsAt: true },
      }),
      prisma.notification.findMany({
        where: { userId: actor.id, readAt: null, type: "MESSAGE" },
        select: { href: true },
      }),
      prisma.listing.count({
        where: { status: { in: EN_LIGNE }, publishedAt: { gte: depuisUneSemaine } },
      }),
    ]);

  const dossiersParAnnonce = new Map(dossiers.map((d) => [d.listingId, d] as const));
  const candidatsParAnnonce = vendeur
    ? new Map(
        await Promise.all(
          annonces
            .filter((a) => EN_LIGNE.includes(a.status) || a.status === "UNDER_NEGOTIATION")
            .map(async (a) => [a.id, await listListingPositions(a.id)] as const),
        ),
      )
    : new Map<string, Awaited<ReturnType<typeof listListingPositions>>>();

  // Mes ventes : une ligne par annonce, à l'étape la plus avancée qu'elle a atteinte.
  const ventes: DossierLigne[] = [];
  const parEtape = [0, 0, 0, 0];
  let aEtudier = 0;
  let enLigne = 0;
  let positionnes = 0;
  let dossierPositionne: number | null = null;

  for (const annonce of annonces) {
    const dossier = dossiersParAnnonce.get(annonce.id);
    const titre = annonce.publicNumber ? `N° ${annonce.publicNumber}` : annonce.portfolio.label;
    const libelle = brancheEtZone(annonce.portfolio.label, annonce.displayedZone);
    const candidats = (candidatsParAnnonce.get(annonce.id) ?? []).filter(
      (c) => c.state.key !== "POSITION" && c.state.outcome === "active",
    );

    if (dossier && dossier.stage !== "CLOSED") {
      parEtape[3] += 1;
      ventes.push({
        key: annonce.id,
        href: `/app/dossiers/${dossier.id}`,
        titre,
        libelle,
        index: 3,
        etape: SALE_PIPELINE[3].label,
        detail: null,
        acteur: acteurVendeur(dossier.stage),
        clos: false,
      });
      continue;
    }

    if (dossier || annonce.status === "SOLD") {
      ventes.push({
        key: annonce.id,
        href: dossier ? `/app/dossiers/${dossier.id}` : `/app/annonces/${annonce.id}`,
        titre,
        libelle,
        index: -1,
        etape: "Vendu",
        detail: "séquestre de conservation 20 %",
        acteur: null,
        clos: true,
      });
      continue;
    }

    if (candidats.length > 0) {
      parEtape[2] += 1;
      positionnes += candidats.length;
      dossierPositionne ??= annonce.publicNumber;
      ventes.push({
        key: annonce.id,
        href: `/app/annonces/${annonce.id}`,
        titre,
        libelle,
        index: 2,
        etape: SALE_PIPELINE[2].label,
        detail: `${candidats.length} acquéreur${candidats.length > 1 ? "s" : ""} positionné${candidats.length > 1 ? "s" : ""}`,
        acteur: "À notre équipe",
        clos: false,
      });
      continue;
    }

    if (EN_LIGNE.includes(annonce.status)) {
      parEtape[1] += 1;
      enLigne += 1;
      ventes.push({
        key: annonce.id,
        href: `/app/annonces/${annonce.id}`,
        titre,
        libelle,
        index: 1,
        etape: SALE_PIPELINE[1].label,
        detail: "en attente d’un positionnement",
        acteur: "Aux acquéreurs",
        clos: false,
      });
      continue;
    }

    if (A_ETUDIER.includes(annonce.status)) {
      parEtape[0] += 1;
      aEtudier += 1;
      ventes.push({
        key: annonce.id,
        href: `/app/annonces/${annonce.id}`,
        titre,
        libelle,
        index: 0,
        etape: SALE_PIPELINE[0].label,
        detail: annonce.status === "DRAFT" ? "dossier à envoyer" : "étude en cours",
        acteur: annonce.status === "DRAFT" ? "À vous" : "À notre équipe",
        clos: false,
      });
    }
  }

  // Mes achats : une ligne par position.
  const achats: DossierLigne[] = positions.map(({ position, state, deal }) => {
    const l = position.listing;
    const clos = state.outcome === "lost" || state.outcome === "withdrawn" || state.outcome === "closed";
    return {
      key: position.id,
      href: `/app/positions/${position.id}`,
      titre: `N° ${l.publicNumber ?? ""}`.trim(),
      libelle: brancheEtZone(l.portfolio.label, l.displayedZone),
      index: clos ? -1 : deal ? 3 : 2,
      etape: clos ? state.title : deal ? SALE_PIPELINE[3].label : SALE_PIPELINE[2].label,
      detail:
        state.key === "POSITION"
          ? `dépôt de ${Math.round(interestDepositFor(Number(l.askingPrice))).toLocaleString("fr-FR")} € à verser`
          : `${Math.round(Number(l.askingPrice)).toLocaleString("fr-FR")} €`,
      acteur: acteurAcheteur(deal?.stage ?? null, state.key !== "POSITION"),
      clos,
    };
  });

  // Positionnements reçus sur mes annonces : qui s'est positionné, et ce qu'il a justifié.
  const recues: PositionRecue[] = [];
  for (const [listingId, candidats] of candidatsParAnnonce) {
    const annonce = annonces.find((a) => a.id === listingId);
    if (!annonce?.publicNumber) continue;
    for (const c of candidats) {
      if (c.state.key === "POSITION" || c.state.outcome !== "active") continue;
      recues.push({
        key: c.position.id,
        href: `/app/annonces/${listingId}`,
        numero: annonce.publicNumber,
        alias: `Acquéreur ${c.position.buyer.publicAlias.replace(/^#/, "")}`,
        detail: c.deposit ? "capacité financière vérifiée · dépôt versé" : "capacité financière vérifiée",
        acteur: "À notre équipe",
      });
    }
  }

  const aVerser = positions.find(({ state }) => state.key === "POSITION" && state.outcome === "active");
  const achatsActifs = achats.filter((a) => !a.clos).length;
  const ventesActives = parEtape.reduce((somme, n) => somme + n, 0);

  const tuiles: Tuile[] = [
    {
      valeur: ventesActives,
      libelle: ventesActives > 1 ? "Ventes en cours" : "Vente en cours",
      detail:
        [
          aEtudier ? `${aEtudier} à l’étude` : null,
          enLigne ? `${enLigne} en ligne` : null,
          parEtape[3] ? `${parEtape[3]} à la signature` : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
    },
    {
      valeur: positionnes,
      libelle: positionnes > 1 ? "Acquéreurs positionnés" : "Acquéreur positionné",
      detail: dossierPositionne ? `sur le dossier n° ${dossierPositionne}` : null,
    },
    {
      valeur: achatsActifs,
      libelle: achatsActifs > 1 ? "Achats en cours" : "Achat en cours",
      detail: aVerser
        ? `dépôt de ${Math.round(interestDepositFor(Number(aVerser.position.listing.askingPrice))).toLocaleString("fr-FR")} € à verser`
        : null,
    },
    {
      valeur: messages.length,
      libelle: messages.length > 1 ? "Messages non lus" : "Message non lu",
      detail: (() => {
        const dossiersConcernes = new Set(messages.map((m) => m.href ?? "")).size;
        return dossiersConcernes > 0
          ? `sur ${dossiersConcernes} dossier${dossiersConcernes > 1 ? "s" : ""}`
          : null;
      })(),
    },
  ];

  const brouillon = annonces.find((a) => a.status === "DRAFT");
  const dossierActif = dossiers.find((d) => d.stage !== "CLOSED");
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
    positionToFund: aVerser
      ? { id: aVerser.position.id, publicNumber: aVerser.position.listing.publicNumber ?? 0 }
      : null,
    activeDealCount: dossiers.filter((d) => d.stage !== "CLOSED").length,
    retentionDue: 0,
  };

  const dernier = cartes[0] ?? null;

  return {
    prenom: actor.fullName?.split(" ")[0] ?? null,
    deuxFacteurs,
    vendeur,
    acheteur,
    abonnement: { actif: Boolean(abonnement), jusquau: abonnement?.renewsAt ?? null },
    action: nextAction(etat),
    tuiles,
    ventes,
    achats,
    recues,
    marche: {
      total: cartes.length,
      certifies: cartes.filter((c) => c.certified).length,
      nouveaux,
      dernier: dernier
        ? {
            numero: dernier.publicNumber,
            commissions: dernier.annualCommissions,
            montant: dernier.askingPrice,
          }
        : null,
    },
  };
}
