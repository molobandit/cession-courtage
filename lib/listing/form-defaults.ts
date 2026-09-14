import type { ListingFormDefaults } from "@/components/listing/listing-forms";
import type { ListingBriefFields } from "@/lib/listing/brief-fields";
import type { FirmProfile } from "@/lib/firm/profile";

/**
 * Valeurs de départ du formulaire d'annonce.
 *
 * Le profil du cabinet se remplit une fois dans le compte : une nouvelle
 * annonce le reprend au lieu de le redemander. Une annonce renvoyée par
 * l'équipe se corrige à partir de ce qui avait été saisi.
 *
 * Fonctions pures, testables sans base.
 */

function texte(v: string | null | undefined): string | undefined {
  return v && v.trim() ? v : undefined;
}

/** Ce que le cédant avait saisi, pour corriger un brouillon. */
export function defaultsFromBrief(brief: ListingBriefFields, sellerSupportMonths: number): ListingFormDefaults {
  const r = brief.regulatory;
  return {
    portfolioKind: texte(brief.portfolioKind),
    branchActivity: texte(brief.branchActivity),
    desiredCessionDate: texte(brief.desiredCessionDate),
    cessionMotive: texte(brief.cessionMotive),
    negotiable: brief.negotiable ? "yes" : "no",
    sellerSupportMonths: String(sellerSupportMonths >= 6 ? 6 : sellerSupportMonths >= 3 ? 3 : 0),
    precompte: brief.precompte === null ? "" : brief.precompte ? "yes" : "no",
    precompteAmount: texte(brief.precompteAmount),
    transferVehicle: texte(r.transferVehicle),
    oriasCategories: texte(r.oriasCategories),
    distribution: texte(r.distribution),
    distanceShare: texte(r.distanceShare),
    complianceDema: texte(r.complianceDema),
    rcProInsurer: texte(r.rcProInsurer),
    employeeCount: texte(r.employeeCount),
    introducersCount: texte(r.introducersCount),
    softwareStack: texte(r.softwareStack),
    socialCommitments: texte(r.socialCommitments),
    pendingLitigation: texte(r.pendingLitigation),
    ddaTraining: texte(r.ddaTraining),
    amlProcedure: texte(r.amlProcedure),
    sellerDependency: texte(r.sellerDependency),
    premisesStatus: texte(r.premisesStatus),
    exclusiveMandates: texte(r.exclusiveMandates),
    stornoShare: texte(r.stornoShare),
    presentation: texte(brief.presentation),
  };
}

const DDA: Record<string, string> = { "À jour": "a_jour", "Rattrapage en cours": "en_cours", "À régulariser": "a_regulariser" };
const LCBFT: Record<string, string> = { Formalisé: "formalise", "Mise à jour en cours": "en_cours", "À formaliser": "a_regulariser" };
const DEMARCHAGE: Record<string, string> = { "Aucun démarchage": "aucun", "Conforme Bloctel": "conforme", "À régulariser": "a_regulariser" };
const DEPENDANCE: Record<string, string> = { "Faible, équipe autonome": "faible", Moyenne: "moyenne", Forte: "forte" };
const DISTRIBUTION: Record<string, string> = { "Agence ou bureau": "agence", "Vente à distance": "distance", Mixte: "mixte" };
const MOTIF: Record<string, string> = { Retraite: "retraite", "Recentrage d’activité": "recentrage", Autre: "autre" };
const ACCOMPAGNEMENT: Record<string, string> = { Aucun: "0", "Jusqu’à 3 mois": "3", "3 à 6 mois": "3", "Plus de 6 mois": "6" };

function un(profile: FirmProfile, section: string, champ: string): string | undefined {
  const v = profile[section]?.[champ];
  return typeof v === "string" && v.trim() ? v : undefined;
}

function plusieurs(profile: FirmProfile, section: string, champ: string): string | undefined {
  const v = profile[section]?.[champ];
  return Array.isArray(v) && v.length ? v.join(", ") : undefined;
}

function via(table: Record<string, string>, v: string | undefined): string | undefined {
  return v ? table[v] : undefined;
}

/** Le profil du cabinet, traduit dans les champs d'une nouvelle annonce. */
export function defaultsFromFirmProfile(profile: FirmProfile): ListingFormDefaults {
  return {
    cessionMotive: via(MOTIF, un(profile, "strategie", "motif")),
    sellerSupportMonths: via(ACCOMPAGNEMENT, un(profile, "strategie", "accompagnement")),
    oriasCategories: plusieurs(profile, "conformite", "orias"),
    rcProInsurer: un(profile, "conformite", "rcPro"),
    ddaTraining: via(DDA, un(profile, "conformite", "dda")),
    amlProcedure: via(LCBFT, un(profile, "conformite", "lcbft")),
    complianceDema: via(DEMARCHAGE, un(profile, "conformite", "demarchage")),
    distribution: via(DISTRIBUTION, un(profile, "organisation", "distribution")),
    employeeCount: un(profile, "organisation", "effectif"),
    introducersCount: un(profile, "organisation", "apporteurs"),
    softwareStack: un(profile, "organisation", "logiciels"),
    premisesStatus: un(profile, "organisation", "locaux"),
    sellerDependency: via(DEPENDANCE, un(profile, "organisation", "dependance")),
    branchActivity: plusieurs(profile, "positionnement", "risques")?.slice(0, 80),
  };
}
