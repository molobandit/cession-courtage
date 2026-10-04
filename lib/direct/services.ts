import { VAT_RATE } from "@/lib/billing/rates";
import type { DirectServices } from "@/lib/direct/fees";
import { stagesFor, type DirectStage } from "@/lib/direct/stages";

/**
 * Services à la carte.
 *
 * Trois portes d'entrée — kit contractuel, transaction sécurisée, attestations
 * de transfert — pour un seul type de dossier. Celui qui ne vient chercher
 * qu'un séquestre ne doit pas remplir un formulaire de kit, mais les deux
 * finissent dans la même table, avec les mêmes garde-fous : un dossier qui
 * combine plusieurs services n'est pas trois dossiers.
 *
 * Fonctions pures, testables sans base.
 */

export type ServiceKey = "kit" | "escrow" | "attestations";
export type ServiceFilter = "kits" | "transactions" | "attestations";

export type ServiceEntry = {
  key: ServiceKey;
  filter: ServiceFilter;
  /** Segment d'adresse historique de la liste. */
  slug: string;
  title: string;
  /** Sous-titre court de la tuile. */
  tagline: string;
  /** Titre de la page de création, tel qu'on le lit en y arrivant. */
  heading: string;
  /** Intitulé de la liste des dossiers correspondants. */
  listTitle: string;
  listLede: string;
  newLabel: string;
  createLabel: string;
  emptyTitle: string;
  emptyText: string;
  /** Formule courte, pour les panneaux du tableau de bord. */
  emptyShort: string;
  pitch: string;
};

export const SERVICE_ENTRIES: ServiceEntry[] = [
  {
    key: "kit",
    filter: "kits",
    slug: "kits-contractuels",
    title: "Kit Contractuel",
    tagline: "Sécurisez vos transactions",
    heading: "Créez votre Kit Contractuel",
    listTitle: "Kits Contractuels",
    listLede: "Voir et gérer tous vos kits contractuels",
    newLabel: "Nouveau Kit Contractuel",
    createLabel: "Créer un kit contractuel",
    emptyTitle: "Pas de kits contractuels",
    emptyText:
      "Vous n’avez pas encore de kits contractuels. Créez votre premier kit contractuel pour sécuriser vos transactions.",
    emptyShort: "Pas encore de kits contractuels",
    pitch: "Accord de confidentialité, protocole de cession et attestations, prêts à signer.",
  },
  {
    key: "escrow",
    filter: "transactions",
    slug: "transactions-securisees",
    title: "Transaction Sécurisée",
    tagline: "Transaction sécurisée",
    heading: "Créez votre transaction sécurisée",
    listTitle: "Transactions Sécurisées",
    listLede: "Voir et gérer toutes vos transactions sécurisées",
    newLabel: "Nouvelle Transaction Sécurisée",
    createLabel: "Créer une transaction sécurisée",
    emptyTitle: "Pas de transactions sécurisées",
    emptyText:
      "Vous n’avez pas encore de transactions sécurisées. Créez votre première transaction pour sécuriser les fonds.",
    emptyShort: "Pas encore de transactions sécurisées",
    pitch: "Le montant reste sur un compte sécurisé, puis il est versé au cédant à la clôture.",
  },
  {
    key: "attestations",
    filter: "attestations",
    slug: "attestations-de-transfert",
    title: "Attestation de transfert",
    tagline: "Générer des attestations",
    heading: "Créer le service d’attestation de transfert",
    listTitle: "Attestations de transfert",
    listLede: "Voir et gérer toutes vos attestations de transfert",
    newLabel: "Nouvelle Attestation de Transfert",
    createLabel: "Créer une Attestation de Transfert",
    emptyTitle: "Pas d’attestations de transfert",
    emptyText:
      "Vous n’avez pas encore d’attestations de transfert. Créez votre première attestation de transfert.",
    emptyShort: "Pas encore d’attestations de transfert",
    pitch: "Une attestation par compagnie, prête à envoyer au service partenaires.",
  },
];

export function serviceByKey(value: string | null | undefined): ServiceEntry | null {
  return SERVICE_ENTRIES.find((s) => s.key === value) ?? null;
}

export function serviceByFilter(value: string | null | undefined): ServiceEntry | null {
  return SERVICE_ENTRIES.find((s) => s.filter === value) ?? null;
}

export function serviceBySlug(value: string | null | undefined): ServiceEntry | null {
  return SERVICE_ENTRIES.find((s) => s.slug === value) ?? null;
}

/** Le prix n'est exigé que par les services qui en dépendent. */
export function priceRequired(services: DirectServices): boolean {
  return services.kit || services.escrow;
}

/** Tri et pagination des listes, lus depuis l'adresse. */
export const PAGE_SIZES = [12, 24, 48, 100] as const;

export function listParams(input: { tri?: string; ordre?: string; parPage?: string; page?: string }) {
  const tri: "createdAt" | "updatedAt" = input.tri === "updatedAt" ? "updatedAt" : "createdAt";
  const ordre: "asc" | "desc" = input.ordre === "asc" ? "asc" : "desc";
  const demande = Number(input.parPage);
  const parPage = (PAGE_SIZES as readonly number[]).includes(demande) ? demande : 12;
  const page = Math.max(1, Math.floor(Number(input.page)) || 1);
  return { tri, ordre, parPage, page };
}

/** Services cochés d'avance quand on arrive par une porte précise. */
export function presetServices(entry: ServiceEntry | null): DirectServices {
  if (!entry) return { kit: true, escrow: false, attestations: false };
  return {
    kit: entry.key === "kit",
    escrow: entry.key === "escrow",
    attestations: entry.key === "attestations",
  };
}

/**
 * Un dossier relève-t-il de cette liste ?
 *
 * Les attestations sont comprises dans le kit : un kit produit des
 * attestations, il doit donc apparaître parmi elles. Le compter à part
 * ferait croire à celui qui a pris le kit qu'il n'en a aucune.
 */
export function matchesFilter(services: DirectServices, filter: ServiceFilter): boolean {
  if (filter === "kits") return services.kit;
  if (filter === "transactions") return services.escrow;
  return services.attestations || services.kit;
}

export function countByFilter(dossiers: DirectServices[]): Record<ServiceFilter, number> {
  return {
    kits: dossiers.filter((d) => matchesFilter(d, "kits")).length,
    transactions: dossiers.filter((d) => matchesFilter(d, "transactions")).length,
    attestations: dossiers.filter((d) => matchesFilter(d, "attestations")).length,
  };
}

/** Honoraires TTC en centimes, pour l'encaissement par carte. */
export function feesTtcCents(totalHt: number): number {
  if (!Number.isFinite(totalHt) || totalHt <= 0) return 0;
  return Math.round(totalHt * (1 + VAT_RATE) * 100);
}

// ---------------------------------------------------------------------------
// Compagnies à transférer
// ---------------------------------------------------------------------------

export type TransferCarrier = { name: string; code: string };

export const MAX_TRANSFER_CARRIERS = 30;

/** Lecture tolérante du JSON stocké : une ligne abîmée est ignorée, pas fatale. */
export function readTransferCarriers(value: unknown): TransferCarrier[] {
  const brut = typeof value === "string" ? safeParse(value) : value;
  if (!Array.isArray(brut)) return [];
  const vus = new Set<string>();
  const sortie: TransferCarrier[] = [];
  for (const item of brut) {
    if (!item || typeof item !== "object") continue;
    const name = String((item as { name?: unknown }).name ?? "").trim();
    const code = String((item as { code?: unknown }).code ?? "").trim();
    if (name.length < 2) continue;
    const cle = name.toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle);
    sortie.push({ name: name.slice(0, 80), code: code.slice(0, 40) });
    if (sortie.length >= MAX_TRANSFER_CARRIERS) break;
  }
  return sortie;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Compagnies saisies dans un formulaire : une par ligne, code courtier après
 * un point-virgule ou une tabulation (copier-coller d'un tableur).
 */
export function parseCarrierLines(text: string): TransferCarrier[] {
  const lignes = text
    .split(/\r?\n/)
    .map((ligne) => ligne.trim())
    .filter(Boolean)
    .map((ligne) => {
      const [name, ...reste] = ligne.split(/[;\t]/);
      return { name: name.trim(), code: reste.join(" ").trim() };
    });
  return readTransferCarriers(lignes);
}

export function carriersToLines(carriers: TransferCarrier[]): string {
  return carriers.map((c) => (c.code ? `${c.name} ; ${c.code}` : c.name)).join("\n");
}

/**
 * Les compagnies peuvent-elles encore changer ?
 *
 * Jusqu'à l'étape des attestations seulement : une attestation émise sur une
 * liste que l'on modifierait ensuite ne correspondrait plus à rien.
 */
export function carriersEditable(stage: DirectStage, services: DirectServices): boolean {
  const ordre = stagesFor(services);
  const transfert = ordre.indexOf("TRANSFER");
  if (transfert < 0) return false;
  return ordre.indexOf(stage) < transfert;
}

/** Ce qui manque encore pour émettre les attestations. */
export function transferBlockers(input: {
  carriers: TransferCarrier[];
  effectiveDate: Date | null;
}): string[] {
  const manques: string[] = [];
  if (input.carriers.length === 0) manques.push("au moins une compagnie");
  if (!input.effectiveDate) manques.push("la date d’effet du transfert");
  return manques;
}
