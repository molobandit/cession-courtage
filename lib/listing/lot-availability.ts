import "server-only";
import { prisma } from "@/lib/prisma";
import {
  availableCarriers,
  buildCarrierLots,
  lotsOverlap,
  summarizeSelection,
  type CarrierLot,
  type LotSelection,
} from "@/lib/listing/lots";

/**
 * Ce qui reste à céder sur une annonce, fournisseur par fournisseur.
 *
 * La vente par lots crée une situation que la vente en bloc ignorait : une
 * annonce peut porter plusieurs cessions en cours. Il faut donc, à chaque
 * offre, savoir quels fournisseurs sont encore libres — sinon deux acquéreurs
 * se retrouvent à acheter le même livre.
 *
 * Tout dossier ouvert immobilise son lot, y compris une fois clos : un
 * fournisseur cédé ne se recède pas. Le modèle n'a pas d'étape « abandonné » ;
 * le jour où elle existera, c'est ici qu'elle libérera les fournisseurs.
 */

/**
 * Lots d'une annonce, calculés sur les lignes qu'elle expose réellement.
 *
 * Une annonce peut ne mettre en vente qu'une partie du portefeuille du cabinet
 * (`isPartial`), la sélection étant portée par `ListingLine`. Lire le
 * portefeuille entier ferait apparaître des fournisseurs qui ne sont pas à
 * céder — et laisserait un acquéreur enchérir dessus.
 */
export async function listingLots(listingId: string): Promise<CarrierLot[]> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      portfolioId: true,
      isPartial: true,
      lines: { select: { contractLineId: true } },
    },
  });
  if (!listing) return [];

  const lines = await prisma.contractLine.findMany({
    where: { portfolioId: listing.portfolioId },
    select: { id: true, carrier: true, annualCommission: true },
  });

  const exposees =
    listing.isPartial && listing.lines.length > 0
      ? (() => {
          const permises = new Set(listing.lines.map((l) => l.contractLineId));
          return lines.filter((line) => permises.has(line.id));
        })()
      : lines;

  return buildCarrierLots(
    exposees.map((line) => ({
      carrier: line.carrier,
      annualCommission: Number(line.annualCommission),
    })),
  );
}

/** Tableau de fournisseurs lu depuis la colonne JSON, tolérant aux vieilles lignes. */
export function readCarriers(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Lots déjà engagés par les dossiers vivants de l'annonce.
 *
 * Un dossier sur le portefeuille entier est enregistré `[]` : il immobilise
 * alors tous les fournisseurs, et c'est bien ce qu'on veut dire.
 */
export async function committedCarriers(
  listingId: string,
  lots: CarrierLot[],
): Promise<string[][]> {
  const deals = await prisma.deal.findMany({
    where: { listingId },
    select: { carriers: true },
  });

  return deals.map((deal) => {
    const carriers = readCarriers(deal.carriers);
    return carriers.length > 0 ? carriers : lots.map((lot) => lot.carrier);
  });
}

export type LotAvailability = {
  lots: CarrierLot[];
  /** Fournisseurs encore cessibles. */
  available: string[];
  /** Vrai si plus rien n'est libre. */
  exhausted: boolean;
};

export async function lotAvailability(listingId: string): Promise<LotAvailability> {
  const lots = await listingLots(listingId);
  const engages = await committedCarriers(listingId, lots);
  const available = availableCarriers(lots, engages);
  return { lots, available, exhausted: lots.length > 0 && available.length === 0 };
}

export type LotCheck =
  | { ok: true; selection: LotSelection; carriers: string[] }
  | { ok: false; error: string };

/**
 * Valide la sélection portée par une offre.
 *
 * Une sélection vide vaut « portefeuille entier » : c'est le cas courant, et
 * l'écrire ainsi évite d'avoir à répéter la liste complète des fournisseurs.
 * Elle n'est alors recevable que si l'annonce est entièrement libre.
 */
export async function checkOfferLot(
  listingId: string,
  demandes: string[],
): Promise<LotCheck> {
  const { lots, available } = await lotAvailability(listingId);
  if (lots.length === 0) {
    // Portefeuille sans ligne importée : la vente par lots n'a pas de prise,
    // l'offre porte sur l'ensemble comme avant.
    return { ok: true, selection: summarizeSelection([], []), carriers: [] };
  }

  const voulus = demandes.length > 0 ? demandes : lots.map((lot) => lot.carrier);
  const selection = summarizeSelection(lots, voulus);
  if (selection.carriers.length === 0) {
    return { ok: false, error: "Choisissez au moins un fournisseur." };
  }

  const indisponibles = selection.carriers.filter((c) => !available.includes(c));
  if (indisponibles.length > 0) {
    return {
      ok: false,
      error:
        indisponibles.length === selection.carriers.length
          ? "Ces fournisseurs font déjà l’objet d’une cession en cours."
          : `Déjà en cours de cession : ${indisponibles.join(", ")}.`,
    };
  }

  // Le portefeuille entier reste enregistré comme tel, pas comme la liste de
  // tous ses fournisseurs : la valeur garde son sens si le portefeuille bouge.
  return { ok: true, selection, carriers: selection.full ? [] : selection.carriers };
}

/** Offres concurrentes à écarter : uniquement celles dont le lot recoupe le lot retenu. */
export async function conflictingOfferIds(
  listingId: string,
  retenue: string,
  lotRetenu: string[],
  lots: CarrierLot[],
): Promise<string[]> {
  const autres = await prisma.offer.findMany({
    where: { listingId, id: { not: retenue }, status: "SUBMITTED" },
    select: { id: true, carriers: true },
  });
  const tous = lots.map((lot) => lot.carrier);
  const effectif = lotRetenu.length > 0 ? lotRetenu : tous;

  return autres
    .filter((offre) => {
      const carriers = readCarriers(offre.carriers);
      return lotsOverlap(effectif, carriers.length > 0 ? carriers : tous);
    })
    .map((offre) => offre.id);
}
