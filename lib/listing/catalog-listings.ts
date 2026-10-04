/**
 * Catalogue de démonstration : huit fiches publiques, sans donnée nominative.
 * Zone = departement ou region. Reference Dossier n° 10101+.
 */

import { computeValuation } from "@/lib/valuation/compute";
import { DEFAULT_MULTIPLES } from "@/lib/valuation/defaults";
import { ASKING_MAX, ASKING_MIN } from "@/lib/listing/constants";

export const CATALOG_FIRM_ID = "firm_catalog";

/** Compte cédant du catalogue : celui qui retient les offres et mène les dossiers. */
export const CATALOG_SELLER = {
  id: "usr_catalog_seller",
  email: "cedant.catalogue@cession-courtage.demo",
  oriasNumber: "17001090",
  publicAlias: "C90",
  fullName: "Cédant Catalogue",
} as const;
/*
 * Huit dossiers de démonstration, pas quatre-vingts.
 *
 * Le catalogue sert à faire vivre la salle de marché et les tests, pas à
 * simuler un volume. Avec les deux annonces du seed qui restent en ligne, la
 * salle compte dix dossiers : six certifiés, quatre non. Assez pour montrer
 * les trois statuts et les deux niveaux de certification, et assez court pour
 * qu'on la lise d'un coup d'œil.
 */
export const CATALOG_COUNT = 8;
export const CATALOG_PUBLIC_NUMBER_START = 10_101;

const CARRIERS = [
  "AXA",
  "Allianz",
  "Generali",
  "Swiss Life",
  "April",
  "Alptis",
  "Solly Azar",
  "Néoliane",
  "Netvox",
  "Zephir",
  "Spvie",
  "Entoria",
] as const;

const RISKS = [
  "HEALTH_INDIVIDUAL",
  "HEALTH_SENIOR",
  "HEALTH_GROUP",
  "PROVIDENT",
  "LOAN_INSURANCE",
  "AUTO",
  "HOME",
  "MOTORCYCLE",
  "PROFESSIONAL_MULTIRISK",
  "PROFESSIONAL_LIABILITY",
  "DECENNIAL",
  "LEGAL_PROTECTION",
  "FUNERAL",
  "SAVINGS",
  "RETIREMENT",
  "FLEET",
  "LANDLORD",
] as const;

const SEGMENTS = ["INDIVIDUAL", "PROFESSIONAL", "COMPANY"] as const;

/*
 * Commission annuelle moyenne par contrat, branche par branche.
 *
 * Le dossier 10412 donne environ 180 € par contrat et par an. Un risque de
 * masse descend sous ce chiffre, un contrat d'entreprise monte au-dessus, et
 * l'ensemble tient entre 120 et 400 €. C'est ce barème qui fixe le nombre de
 * contrats d'un dossier de démonstration, et non l'inverse.
 */
const BRANCH_COMMISSION: Record<(typeof RISKS)[number], number> = {
  HEALTH_INDIVIDUAL: 185,
  HEALTH_SENIOR: 225,
  HEALTH_GROUP: 375,
  PROVIDENT: 210,
  LOAN_INSURANCE: 150,
  AUTO: 135,
  HOME: 120,
  MOTORCYCLE: 125,
  PROFESSIONAL_MULTIRISK: 340,
  PROFESSIONAL_LIABILITY: 265,
  DECENNIAL: 390,
  LEGAL_PROTECTION: 130,
  FUNERAL: 140,
  SAVINGS: 300,
  RETIREMENT: 285,
  FLEET: 400,
  LANDLORD: 165,
};

const ZONES: { department: string; region: string; regionCode: string; label: string; postal: string }[] = [
  { department: "75", region: "Île-de-France", regionCode: "IDF", label: "Paris", postal: "75002" },
  { department: "92", region: "Île-de-France", regionCode: "IDF", label: "Hauts-de-Seine", postal: "92100" },
  { department: "13", region: "Provence-Alpes-Côte d’Azur", regionCode: "PACA", label: "Bouches-du-Rhône", postal: "13001" },
  { department: "83", region: "Provence-Alpes-Côte d’Azur", regionCode: "PACA", label: "Var", postal: "83000" },
  { department: "69", region: "Auvergne-Rhône-Alpes", regionCode: "ARA", label: "Rhône", postal: "69002" },
  { department: "38", region: "Auvergne-Rhône-Alpes", regionCode: "ARA", label: "Isère", postal: "38000" },
  { department: "33", region: "Nouvelle-Aquitaine", regionCode: "NAQ", label: "Gironde", postal: "33000" },
  { department: "31", region: "Occitanie", regionCode: "OCC", label: "Haute-Garonne", postal: "31000" },
  { department: "44", region: "Pays de la Loire", regionCode: "PDL", label: "Loire-Atlantique", postal: "44000" },
  { department: "35", region: "Bretagne", regionCode: "BRE", label: "Ille-et-Vilaine", postal: "35000" },
  { department: "59", region: "Hauts-de-France", regionCode: "HDF", label: "Nord", postal: "59000" },
  { department: "67", region: "Grand Est", regionCode: "GES", label: "Bas-Rhin", postal: "67000" },
  { department: "06", region: "Provence-Alpes-Côte d’Azur", regionCode: "PACA", label: "Alpes-Maritimes", postal: "06000" },
  { department: "34", region: "Occitanie", regionCode: "OCC", label: "Hérault", postal: "34000" },
  { department: "45", region: "Centre-Val de Loire", regionCode: "CVL", label: "Loiret", postal: "45000" },
  { department: "2A", region: "Corse", regionCode: "COR", label: "Corse-du-Sud", postal: "20000" },
];

export type CatalogContractLine = {
  id: string;
  carrier: string;
  riskType: (typeof RISKS)[number];
  premium: string;
  commissionRate: string;
  annualCommission: string;
  annualCommissionNumber: number;
  effectiveDate: string;
  renewalDate: string;
  clientSegment: (typeof SEGMENTS)[number];
  postalCode: string;
  commissionType: "LINEAR" | "ADVANCED";
  clientKey: string;
  department: string;
};

export type CatalogListingRow = {
  pad: string;
  listingId: string;
  portfolioId: string;
  publicNumber: number;
  firmId: string;
  label: string;
  contractCount: number;
  clientCount: number;
  annualCommissions: string;
  averageAgeMonths: number;
  churnRate12m: string;
  askingPrice: string;
  displayedZone: string;
  isPartial: boolean;
  isNationwide: boolean;
  sellerSupportMonths: number;
  /** Statut public : disponible, acquéreur positionné, vendu. */
  status: "OFFERS_OPEN" | "UNDER_NEGOTIATION" | "SOLD";
  publishedAt: string;
  departmentsJson: string;
  regionsJson: string;
  certificationStatus: "NONE" | "CERTIFIED";
  lines: CatalogContractLine[];
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDaysFrom(base: string, days: number): string {
  const t = Date.parse(base) + days * 24 * 60 * 60 * 1000;
  return new Date(t).toISOString();
}

/** Point de reference fixe pour un catalogue reproductible. */
const CATALOG_NOW = "2026-09-09T10:00:00.000Z";

export function buildCatalogListings(): CatalogListingRow[] {
  const rows: CatalogListingRow[] = [];

  for (let i = 1; i <= CATALOG_COUNT; i += 1) {
    const pad = pad2(i);
    const zone = ZONES[(i - 1) % ZONES.length]!;
    const nationwide = i % 17 === 0;
    // Cinq certifiés ici, plus l'annonce certifiée du seed : six en salle.
    const certified = i <= 5;
    const support = [0, 3, 6][i % 3]!;
    // Un vendu, un avec acquéreur positionné, six disponibles.
    const status = i === 7 ? "SOLD" : i === 8 ? "UNDER_NEGOTIATION" : "OFFERS_OPEN";
    // Plafonné pour que la valeur centrale de l'étude reste sous ASKING_MAX :
    // un dossier dont le prix serait rogné par la borne sortirait de sa propre
    // fourchette, et la fiche se contredirait.
    const commissions = 12_000 + ((i * 2_830) % 52_000);
    const roundedComm = Math.round(commissions * 100) / 100;
    const publishedAt = isoDaysFrom(CATALOG_NOW, -(i % 45));

    const departments = nationwide ? ZONES.slice(0, 8).map((z) => z.department) : [zone.department];
    const regionCodes = nationwide
      ? [...new Set(ZONES.slice(0, 8).map((z) => z.regionCode))]
      : [zone.regionCode];
    const displayedZone = nationwide ? "Couverture nationale" : zone.label;

    /*
     * Une ligne de contrat par contrat annoncé.
     *
     * La carte affichait 241 contrats quand la fiche en détaillait deux : le
     * nombre venait du portefeuille, le détail des lignes réellement
     * enregistrées. Le catalogue génère désormais autant de lignes qu'il
     * annonce de contrats, réparties sur trois branches et trois compagnies,
     * et les commissions des lignes font exactement le total du portefeuille.
     */
    const branches = [0, 4, 9].map((offset) => RISKS[(i - 1 + offset) % RISKS.length]!);
    const carriers = [0, 3, 7].map((offset) => CARRIERS[(i - 1 + offset) % CARRIERS.length]!);
    const poids = [0.52, 0.31, 0.17];

    /*
     * Le nombre de contrats se déduit des commissions, au tarif des branches
     * du dossier : un portefeuille de 40 000 € en santé individuelle compte
     * environ 215 contrats, pas 43. Les lignes portent ensuite la moyenne de
     * leur branche, et la dernière absorbe l'arrondi pour que leur somme fasse
     * exactement le total annoncé.
     */
    const moyennes = branches.map((branche) => BRANCH_COMMISSION[branche]);
    const moyennePonderee = moyennes.reduce((somme, m, g) => somme + m * poids[g]!, 0);
    const contracts = Math.max(20, Math.round(roundedComm / moyennePonderee));
    const parGroupe = poids.map((p) => Math.max(1, Math.round(contracts * p)));
    parGroupe[2] = Math.max(1, contracts - parGroupe[0]! - parGroupe[1]!);

    const lines: CatalogContractLine[] = [];
    let reste = Math.round(roundedComm * 100);
    let n = 0;
    for (let groupe = 0; groupe < 3; groupe += 1) {
      for (let k = 0; k < parGroupe[groupe]!; k += 1, n += 1) {
        const derniere = groupe === 2 && k === parGroupe[2]! - 1;
        // Une variation de quelques euros autour de la moyenne : deux contrats
        // d'une même branche ne rapportent jamais exactement pareil.
        const cible = Math.round(moyennes[groupe]! * (1 + (((i + n) % 11) - 5) * 0.02) * 100);
        const montant = Math.max(100, derniere ? reste : Math.min(reste - (contracts - n - 1) * 100, cible)) / 100;
        reste -= Math.round(montant * 100);
        const taux = 0.1 + ((i + n) % 9) * 0.01;
        const anciennete = 12 + ((i * 3 + n * 11) % 84);
        lines.push({
          id: `cl_catalog_${pad}_${pad2(n + 1)}`,
          carrier: carriers[groupe]!,
          riskType: branches[groupe]!,
          premium: (montant / taux).toFixed(2),
          commissionRate: taux.toFixed(4),
          annualCommission: montant.toFixed(2),
          annualCommissionNumber: montant,
          // Antériorité étalée sur sept ans : les exercices passés ne sont jamais vides.
          effectiveDate: isoDaysFrom(CATALOG_NOW, -30 * anciennete),
          // Échéances réparties sur les douze mois à venir.
          renewalDate: isoDaysFrom(CATALOG_NOW, 10 + ((i * 5 + n * 13) % 350)),
          clientSegment: SEGMENTS[(i + n) % SEGMENTS.length]!,
          postalCode: zone.postal,
          commissionType: n % 23 === 0 ? "ADVANCED" : "LINEAR",
          clientKey: `ck_catalog_${pad}_${pad2(Math.floor(n / 2) + 1)}`,
          department: nationwide ? ZONES[n % 8]!.department : zone.department,
        });
      }
    }

    const totalLignes = lines.reduce((somme, l) => somme + l.annualCommissionNumber, 0);
    const ancienneteMoyenne = Math.round(
      lines.reduce((somme, l) => somme + (Date.parse(CATALOG_NOW) - Date.parse(l.effectiveDate)) / (30 * 86_400_000), 0) /
        lines.length,
    );
    const clients = new Set(lines.map((l) => l.clientKey)).size;

    /*
     * Le montant de l'annonce sort de l'étude, comme sur la plateforme : c'est
     * l'équipe qui le fixe après avoir valorisé le portefeuille, jamais un
     * facteur arbitraire. On passe donc les lignes dans le même algorithme que
     * la fiche, et on retient la valeur centrale. Le multiple affiché tombe
     * ainsi toujours à l'intérieur de la fourchette.
     */
    const etude = computeValuation({
      lines: lines.map((l) => ({
        carrier: l.carrier,
        riskType: l.riskType as Parameters<typeof computeValuation>[0]["lines"][number]["riskType"],
        annualCommission: l.annualCommissionNumber,
        commissionType: l.commissionType as Parameters<typeof computeValuation>[0]["lines"][number]["commissionType"],
        clientKey: l.clientKey,
        effectiveDate: new Date(l.effectiveDate),
      })),
      firm: { distributionMode: "REMOTE", complianceScore: 100 },
      sellerSupportMonths: support,
      churnRate12m: 0.03 + (i % 10) * 0.004,
      averageAgeMonths: ancienneteMoyenne,
      multiples: DEFAULT_MULTIPLES,
    });
    const roundedAsk =
      Math.round(Math.min(ASKING_MAX, Math.max(ASKING_MIN, etude.midValue)) / 500) * 500;

    rows.push({
      pad,
      listingId: `lst_catalog_${pad}`,
      portfolioId: `pf_catalog_${pad}`,
      publicNumber: CATALOG_PUBLIC_NUMBER_START + i - 1,
      firmId: CATALOG_FIRM_ID,
      label: `Catalogue ${displayedZone} ${pad}`,
      contractCount: lines.length,
      clientCount: clients,
      annualCommissions: (Math.round(totalLignes * 100) / 100).toFixed(2),
      averageAgeMonths: ancienneteMoyenne,
      churnRate12m: (0.03 + (i % 10) * 0.004).toFixed(4),
      askingPrice: roundedAsk.toFixed(2),
      displayedZone,
      isPartial: false,
      isNationwide: nationwide,
      sellerSupportMonths: support,
      status,
      publishedAt,
      departmentsJson: JSON.stringify(departments),
      regionsJson: JSON.stringify(regionCodes),
      certificationStatus: certified ? "CERTIFIED" : "NONE",
      lines,
    });
  }

  return rows;
}

export const CATALOG_FIRM = {
  id: CATALOG_FIRM_ID,
  /*
   * Une raison sociale, pas un nom de jeu de données : c'est elle que lit
   * l'acquéreur qui a versé son dépôt, à la ligne « Contrepartie » du dossier
   * de cession. « Catalogue de demonstration » y faisait compte technique.
   */
  legalName: "Cabinet Horizon Courtage",
  siren: "890190080",
  legalForm: "SAS",
  address: "1 rue de la Bourse",
  postalCode: "75002",
  city: "Paris",
  department: "75",
  region: "Île-de-France",
  foundedAt: "2024-01-15T00:00:00.000Z",
  headcount: 2,
  annualRevenue: "0.00",
  distributionMode: "REMOTE",
  complianceScore: 100,
};
