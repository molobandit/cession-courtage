import { createHash } from "node:crypto";
import { hashPassword } from "../lib/auth/password";
import { buildChecklist } from "../lib/deal/due-diligence";
import { FIRST_MANDATE_PUBLIC_NUMBER } from "../lib/mandate/public";
import { FREE_PLAN_DEAL_QUOTA, SUCCESS_FEE_RATE } from "../lib/billing/rates";
import {
  ClientSegment,
  CommissionType,
  DealStage,
  DistributionMode,
  DocumentType,
  EscrowStage,
  FinancingMode,
  ImportStatus,
  KycStatus,
  ListingStatus,
  MatchStatus,
  NotificationType,
  OfferStatus,
  PrismaClient,
  RiskType,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
  type Prisma,
  CarrierCodeStatus,
  DueDiligenceCategory,
} from "@prisma/client";
import {
  CARRIERS,
  GEO_ZONES,
  RISK_WEIGHTS,
  computeSeedValuation,
  money,
  mulberry32,
  pick,
  pickWeighted,
  type ValuationBreakdown,
} from "./seed-helpers";
import { ALGORITHM_VERSION } from "../lib/valuation/types";
import { adjustedDeferredAmount } from "../lib/retention/adjust";
import { buildCatalogListings, CATALOG_FIRM } from "../lib/listing/catalog-listings";

let prisma: PrismaClient;
let disposePlatform: (() => Promise<void>) | undefined;

async function createPrismaClient(): Promise<PrismaClient> {
  if (process.env.SEED_D1 === "1") {
    const { getPlatformProxy } = await import("wrangler");
    const { PrismaD1 } = await import("@prisma/adapter-d1");
    type D1 = ConstructorParameters<typeof PrismaD1>[0];
    const proxy = await getPlatformProxy<{ DB: D1 }>();
    disposePlatform = proxy.dispose;
    if (!proxy.env.DB) {
      throw new Error("Binding D1 DB manquant (wrangler.jsonc).");
    }
    return new PrismaClient({ adapter: new PrismaD1(proxy.env.DB) });
  }
  return new PrismaClient();
}

const DEMO_PASSWORD = "Demo2026!";
const NOW = new Date("2026-09-07T10:00:00.000Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

function daysFromNow(n: number): Date {
  return new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const SELLERS: {
  id: string;
  firmId: string;
  email: string;
  fullName: string;
  phone: string;
  orias: string;
  alias: string;
  firm: {
    legalName: string;
    siren: string;
    legalForm: string;
    address: string;
    postalCode: string;
    city: string;
    department: string;
    region: string;
    foundedAt: Date;
    headcount: number;
    annualRevenue: string;
    distributionMode: DistributionMode;
    complianceScore: number;
  };
}[] = [
  {
    id: "user_seller_01",
    firmId: "firm_01",
    email: "marie.lefort@parisienne-courtage.demo",
    fullName: "Marie Lefort",
    phone: "+33645120001",
    orias: "17001001",
    alias: "C12",
    firm: {
      legalName: "Parisienne de Courtage",
      siren: "890120001",
      legalForm: "SAS",
      address: "18 rue de la Banque",
      postalCode: "75002",
      city: "Paris",
      department: "75",
      region: "Île-de-France",
      foundedAt: new Date("2009-03-12"),
      headcount: 7,
      annualRevenue: "920000.00",
      distributionMode: DistributionMode.MIXED,
      complianceScore: 88,
    },
  },
  {
    id: "user_seller_02",
    firmId: "firm_02",
    email: "julien.bernard@rhone-assurances.demo",
    fullName: "Julien Bernard",
    phone: "+33645120002",
    orias: "17001002",
    alias: "C18",
    firm: {
      legalName: "Cabinet Rhône Assurances",
      siren: "890120002",
      legalForm: "SARL",
      address: "4 place Bellecour",
      postalCode: "69002",
      city: "Lyon",
      department: "69",
      region: "Auvergne-Rhône-Alpes",
      foundedAt: new Date("1998-06-01"),
      headcount: 12,
      annualRevenue: "1450000.00",
      distributionMode: DistributionMode.AGENCY,
      complianceScore: 91,
    },
  },
  {
    id: "user_seller_03",
    firmId: "firm_03",
    email: "nadia.khelifi@mediterranee-courtage.demo",
    fullName: "Nadia Khelifi",
    phone: "+33645120003",
    orias: "17001003",
    alias: "C24",
    firm: {
      legalName: "Méditerranée Courtage",
      siren: "890120003",
      legalForm: "SASU",
      address: "27 la Canebière",
      postalCode: "13001",
      city: "Marseille",
      department: "13",
      region: "Provence-Alpes-Côte d'Azur",
      foundedAt: new Date("2014-09-20"),
      headcount: 4,
      annualRevenue: "480000.00",
      distributionMode: DistributionMode.OFFICE,
      complianceScore: 76,
    },
  },
  {
    id: "user_seller_04",
    firmId: "firm_04",
    email: "eric.moreau@atlantique-protection.demo",
    fullName: "Éric Moreau",
    phone: "+33645120004",
    orias: "17001004",
    alias: "C31",
    firm: {
      legalName: "Atlantique Protection",
      siren: "890120004",
      legalForm: "SAS",
      address: "11 cours des 50 Otages",
      postalCode: "44000",
      city: "Nantes",
      department: "44",
      region: "Pays de la Loire",
      foundedAt: new Date("2005-01-15"),
      headcount: 9,
      annualRevenue: "1100000.00",
      distributionMode: DistributionMode.MIXED,
      complianceScore: 84,
    },
  },
  {
    id: "user_seller_05",
    firmId: "firm_05",
    email: "claire.dubois@nord-assur-pro.demo",
    fullName: "Claire Dubois",
    phone: "+33645120005",
    orias: "17001005",
    alias: "C37",
    firm: {
      legalName: "Nord Assur Pro",
      siren: "890120005",
      legalForm: "EURL",
      address: "8 rue Faidherbe",
      postalCode: "59000",
      city: "Lille",
      department: "59",
      region: "Hauts-de-France",
      foundedAt: new Date("2017-11-02"),
      headcount: 3,
      annualRevenue: "310000.00",
      distributionMode: DistributionMode.AGENCY,
      complianceScore: 62,
    },
  },
  {
    id: "user_seller_06",
    firmId: "firm_06",
    email: "antoine.perrin@alpes-conseil.demo",
    fullName: "Antoine Perrin",
    phone: "+33645120006",
    orias: "17001006",
    alias: "C41",
    firm: {
      legalName: "Alpes Conseil Courtage",
      siren: "890120006",
      legalForm: "SARL",
      address: "15 boulevard Gambetta",
      postalCode: "38000",
      city: "Grenoble",
      department: "38",
      region: "Auvergne-Rhône-Alpes",
      foundedAt: new Date("2001-04-08"),
      headcount: 6,
      annualRevenue: "670000.00",
      distributionMode: DistributionMode.OFFICE,
      complianceScore: 81,
    },
  },
  {
    id: "user_seller_07",
    firmId: "firm_07",
    email: "sofia.martinez@occitanie-prevoyance.demo",
    fullName: "Sofia Martinez",
    phone: "+33645120007",
    orias: "17001007",
    alias: "C48",
    firm: {
      legalName: "Occitanie Prévoyance",
      siren: "890120007",
      legalForm: "SASU",
      address: "22 rue Alsace-Lorraine",
      postalCode: "31000",
      city: "Toulouse",
      department: "31",
      region: "Occitanie",
      foundedAt: new Date("2021-02-01"),
      headcount: 2,
      annualRevenue: "190000.00",
      distributionMode: DistributionMode.REMOTE,
      complianceScore: 55,
    },
  },
  {
    id: "user_seller_08",
    firmId: "firm_08",
    email: "yann.legoff@bretagne-courtage.demo",
    fullName: "Yann Le Goff",
    phone: "+33645120008",
    orias: "17001008",
    alias: "C52",
    firm: {
      legalName: "Bretagne Courtage",
      siren: "890120008",
      legalForm: "SAS",
      address: "6 place de la Mairie",
      postalCode: "35000",
      city: "Rennes",
      department: "35",
      region: "Bretagne",
      foundedAt: new Date("1995-10-10"),
      headcount: 11,
      annualRevenue: "1320000.00",
      distributionMode: DistributionMode.AGENCY,
      complianceScore: 90,
    },
  },
  {
    id: "user_seller_09",
    firmId: "firm_09",
    email: "helene.wagner@est-protection.demo",
    fullName: "Hélène Wagner",
    phone: "+33645120009",
    orias: "17001009",
    alias: "C59",
    firm: {
      legalName: "Est Protection",
      siren: "890120009",
      legalForm: "SARL",
      address: "3 place Kléber",
      postalCode: "67000",
      city: "Strasbourg",
      department: "67",
      region: "Grand Est",
      foundedAt: new Date("2007-07-19"),
      headcount: 5,
      annualRevenue: "540000.00",
      distributionMode: DistributionMode.OFFICE,
      complianceScore: 73,
    },
  },
  {
    id: "user_seller_10",
    firmId: "firm_10",
    email: "paul.riviere@aquitaine-assur.demo",
    fullName: "Paul Rivière",
    phone: "+33645120010",
    orias: "17001010",
    alias: "C63",
    firm: {
      legalName: "Aquitaine Assur",
      siren: "890120010",
      legalForm: "SAS",
      address: "9 cours de l'Intendance",
      postalCode: "33000",
      city: "Bordeaux",
      department: "33",
      region: "Nouvelle-Aquitaine",
      foundedAt: new Date("2012-05-22"),
      headcount: 8,
      annualRevenue: "880000.00",
      distributionMode: DistributionMode.MIXED,
      complianceScore: 86,
    },
  },
  {
    id: "user_seller_11",
    firmId: "firm_11",
    email: "laure.petit@centre-loire.demo",
    fullName: "Laure Petit",
    phone: "+33645120011",
    orias: "17001011",
    alias: "C70",
    firm: {
      legalName: "Centre Loire Courtage",
      siren: "890120011",
      legalForm: "EURL",
      address: "14 rue Bannier",
      postalCode: "45000",
      city: "Orléans",
      department: "45",
      region: "Centre-Val de Loire",
      foundedAt: new Date("2016-08-30"),
      headcount: 3,
      annualRevenue: "260000.00",
      distributionMode: DistributionMode.OFFICE,
      complianceScore: 79,
    },
  },
  {
    id: "user_seller_12",
    firmId: "firm_12",
    email: "marc.antonini@corse-mediterranee.demo",
    fullName: "Marc Antonini",
    phone: "+33645120012",
    orias: "17001012",
    alias: "C77",
    firm: {
      legalName: "Corse Méditerranée Assur",
      siren: "890120012",
      legalForm: "SASU",
      address: "5 cours Napoléon",
      postalCode: "20000",
      city: "Ajaccio",
      department: "2A",
      region: "Corse",
      foundedAt: new Date("2023-01-09"),
      headcount: 1,
      annualRevenue: "95000.00",
      distributionMode: DistributionMode.REMOTE,
      complianceScore: 48,
    },
  },
];

const BUYERS: {
  id: string;
  firmId: string;
  email: string;
  fullName: string;
  phone: string;
  orias: string;
  alias: string;
  plan: SubscriptionPlan;
  firm: {
    legalName: string;
    siren: string;
    legalForm: string;
    address: string;
    postalCode: string;
    city: string;
    department: string;
    region: string;
    foundedAt: Date;
    headcount: number;
    annualRevenue: string;
    distributionMode: DistributionMode;
    complianceScore: number;
  };
}[] = [
  {
    id: "user_buyer_01",
    firmId: "firm_b01",
    email: "acquisition@expansion-idf.demo",
    fullName: "Thomas Girard",
    phone: "+33645130001",
    orias: "17002001",
    alias: "A11",
    plan: SubscriptionPlan.GROWTH,
    firm: {
      legalName: "Expansion Courtage Île-de-France",
      siren: "890130001",
      legalForm: "SAS",
      address: "42 avenue de l'Opéra",
      postalCode: "75002",
      city: "Paris",
      department: "75",
      region: "Île-de-France",
      foundedAt: new Date("2004-02-14"),
      headcount: 22,
      annualRevenue: "4200000.00",
      distributionMode: DistributionMode.MIXED,
      complianceScore: 93,
    },
  },
  {
    id: "user_buyer_02",
    firmId: "firm_b02",
    email: "direction@alliance-paca.demo",
    fullName: "Camille Rossi",
    phone: "+33645130002",
    orias: "17002002",
    alias: "A19",
    plan: SubscriptionPlan.GROWTH,
    firm: {
      legalName: "Alliance Portefeuilles PACA",
      siren: "890130002",
      legalForm: "SAS",
      address: "10 rue Paradis",
      postalCode: "13001",
      city: "Marseille",
      department: "13",
      region: "Provence-Alpes-Côte d'Azur",
      foundedAt: new Date("2010-09-01"),
      headcount: 14,
      annualRevenue: "2100000.00",
      distributionMode: DistributionMode.AGENCY,
      complianceScore: 87,
    },
  },
  {
    id: "user_buyer_03",
    firmId: "firm_b03",
    email: "croissance@mutuelle-lyon.demo",
    fullName: "Nicolas Favier",
    phone: "+33645130003",
    orias: "17002003",
    alias: "A27",
    plan: SubscriptionPlan.FREE,
    firm: {
      legalName: "Croissance Mutuelle Lyon",
      siren: "890130003",
      legalForm: "SARL",
      address: "19 rue de la République",
      postalCode: "69002",
      city: "Lyon",
      department: "69",
      region: "Auvergne-Rhône-Alpes",
      foundedAt: new Date("2015-03-18"),
      headcount: 8,
      annualRevenue: "980000.00",
      distributionMode: DistributionMode.OFFICE,
      complianceScore: 80,
    },
  },
  {
    id: "user_buyer_04",
    firmId: "firm_b04",
    email: "achats@ouest-acquisitions.demo",
    fullName: "Isabelle Renou",
    phone: "+33645130004",
    orias: "17002004",
    alias: "A33",
    plan: SubscriptionPlan.GROWTH,
    firm: {
      legalName: "Ouest Acquisitions Courtage",
      siren: "890130004",
      legalForm: "SAS",
      address: "7 quai de la Fosse",
      postalCode: "44000",
      city: "Nantes",
      department: "44",
      region: "Pays de la Loire",
      foundedAt: new Date("2008-12-05"),
      headcount: 16,
      annualRevenue: "2600000.00",
      distributionMode: DistributionMode.MIXED,
      complianceScore: 89,
    },
  },
  {
    id: "user_buyer_05",
    firmId: "firm_b05",
    email: "mandat@horizon-courtage.demo",
    fullName: "Alexandre Vidal",
    phone: "+33645130005",
    orias: "17002005",
    alias: "A40",
    plan: SubscriptionPlan.FREE,
    firm: {
      legalName: "Horizon Courtage National",
      siren: "890130005",
      legalForm: "SAS",
      address: "1 place de la Bourse",
      postalCode: "33000",
      city: "Bordeaux",
      department: "33",
      region: "Nouvelle-Aquitaine",
      foundedAt: new Date("2011-06-21"),
      headcount: 19,
      annualRevenue: "3100000.00",
      distributionMode: DistributionMode.REMOTE,
      complianceScore: 85,
    },
  },
  {
    id: "user_buyer_06",
    firmId: "firm_b06",
    email: "sante@sud-acquisitions.demo",
    fullName: "Leïla Benali",
    phone: "+33645130006",
    orias: "17002006",
    alias: "A47",
    plan: SubscriptionPlan.GROWTH,
    firm: {
      legalName: "Sud Santé Acquisitions",
      siren: "890130006",
      legalForm: "SASU",
      address: "16 allée Jean-Jaurès",
      postalCode: "31000",
      city: "Toulouse",
      department: "31",
      region: "Occitanie",
      foundedAt: new Date("2018-04-04"),
      headcount: 5,
      annualRevenue: "720000.00",
      distributionMode: DistributionMode.OFFICE,
      complianceScore: 77,
    },
  },
  {
    id: "user_buyer_07",
    firmId: "firm_b07",
    email: "direction@capital-hdf.demo",
    fullName: "Benoît Lemoine",
    phone: "+33645130007",
    orias: "17002007",
    alias: "A54",
    plan: SubscriptionPlan.FREE,
    firm: {
      legalName: "Capital Courtage Hauts-de-France",
      siren: "890130007",
      legalForm: "SARL",
      address: "12 grand'place",
      postalCode: "59000",
      city: "Lille",
      department: "59",
      region: "Hauts-de-France",
      foundedAt: new Date("2013-01-28"),
      headcount: 7,
      annualRevenue: "810000.00",
      distributionMode: DistributionMode.AGENCY,
      complianceScore: 82,
    },
  },
  {
    id: "user_buyer_08",
    firmId: "firm_b08",
    email: "contact@independants-reunis.demo",
    fullName: "Sarah Cohen",
    phone: "+33645130008",
    orias: "17002008",
    alias: "A61",
    plan: SubscriptionPlan.FREE,
    firm: {
      legalName: "Indépendants Réunis",
      siren: "890130008",
      legalForm: "SAS",
      address: "3 rue du Palais",
      postalCode: "45000",
      city: "Orléans",
      department: "45",
      region: "Centre-Val de Loire",
      foundedAt: new Date("2019-09-12"),
      headcount: 4,
      annualRevenue: "340000.00",
      distributionMode: DistributionMode.MIXED,
      complianceScore: 74,
    },
  },
];

const PORTFOLIO_SPECS: {
  id: string;
  firmId: string;
  sellerId: string;
  label: string;
  lineCount: number;
  geoIndexes: number[];
  concentratedCarrier?: (typeof CARRIERS)[number];
  churnRate: number;
  avgAgeMonths: number;
  advancedShare: number;
}[] = [
  { id: "pf_01", firmId: "firm_01", sellerId: "user_seller_01", label: "Portefeuille IARD / santé Île-de-France", lineCount: 92, geoIndexes: [0, 1], churnRate: 0.062, avgAgeMonths: 44, advancedShare: 0.05 },
  { id: "pf_02", firmId: "firm_02", sellerId: "user_seller_02", label: "Portefeuille agence Lyon, santé et IARD", lineCount: 148, geoIndexes: [4, 5], churnRate: 0.041, avgAgeMonths: 78, advancedShare: 0.04 },
  { id: "pf_03", firmId: "firm_03", sellerId: "user_seller_03", label: "Portefeuille PACA, emprunteur et santé", lineCount: 215, geoIndexes: [2, 3], churnRate: 0.088, avgAgeMonths: 31, advancedShare: 0.12 },
  { id: "pf_04", firmId: "firm_04", sellerId: "user_seller_04", label: "Portefeuille Atlantique, mixte", lineCount: 287, geoIndexes: [8], churnRate: 0.055, avgAgeMonths: 52, advancedShare: 0.06 },
  { id: "pf_05", firmId: "firm_05", sellerId: "user_seller_05", label: "Portefeuille Nord, forte concentration AXA", lineCount: 341, geoIndexes: [10], concentratedCarrier: "AXA", churnRate: 0.118, avgAgeMonths: 39, advancedShare: 0.08 },
  { id: "pf_06", firmId: "firm_06", sellerId: "user_seller_06", label: "Portefeuille Alpes, IARD entreprises", lineCount: 456, geoIndexes: [5, 4], churnRate: 0.049, avgAgeMonths: 61, advancedShare: 0.03 },
  { id: "pf_07", firmId: "firm_07", sellerId: "user_seller_07", label: "Portefeuille Occitanie, vente à distance santé", lineCount: 612, geoIndexes: [7, 13], churnRate: 0.172, avgAgeMonths: 14, advancedShare: 0.18 },
  { id: "pf_08", firmId: "firm_08", sellerId: "user_seller_08", label: "Portefeuille Bretagne, historique agence", lineCount: 788, geoIndexes: [9], churnRate: 0.037, avgAgeMonths: 96, advancedShare: 0.02 },
  { id: "pf_09", firmId: "firm_09", sellerId: "user_seller_09", label: "Portefeuille Grand Est, clôturé", lineCount: 934, geoIndexes: [11], churnRate: 0.071, avgAgeMonths: 48, advancedShare: 0.07 },
  { id: "pf_10", firmId: "firm_10", sellerId: "user_seller_10", label: "Portefeuille Aquitaine, retiré de la vente", lineCount: 1102, geoIndexes: [6], churnRate: 0.053, avgAgeMonths: 55, advancedShare: 0.05 },
  { id: "pf_11", firmId: "firm_11", sellerId: "user_seller_11", label: "Portefeuille Centre, non publié", lineCount: 1288, geoIndexes: [14], churnRate: 0.066, avgAgeMonths: 28, advancedShare: 0.09 },
  { id: "pf_12", firmId: "firm_12", sellerId: "user_seller_12", label: "Portefeuille Corse, clientèle récente", lineCount: 1400, geoIndexes: [15, 2], churnRate: 0.143, avgAgeMonths: 9, advancedShare: 0.15 },
];

type BuiltLine = {
  id: string;
  portfolioId: string;
  carrier: string;
  riskType: RiskType;
  premium: Prisma.Decimal | string;
  commissionRate: Prisma.Decimal | string;
  annualCommission: Prisma.Decimal | string;
  effectiveDate: Date;
  renewalDate: Date;
  clientSegment: ClientSegment;
  postalCode: string;
  commissionType: CommissionType;
  clientKey: string;
  department: string;
  annualCommissionNumber: number;
};

function buildLines(spec: (typeof PORTFOLIO_SPECS)[number]): BuiltLine[] {
  const rand = mulberry32(spec.lineCount * 97 + spec.label.length * 13);
  const zones = spec.geoIndexes.map((i) => GEO_ZONES[i]!);
  const clientCount = Math.max(20, Math.round(spec.lineCount * 0.62));
  const lines: BuiltLine[] = [];

  for (let i = 0; i < spec.lineCount; i++) {
    const zone = pick(rand, zones);
    const carrier = spec.concentratedCarrier && rand() < 0.72
      ? spec.concentratedCarrier
      : pick(rand, CARRIERS);
    const risk = pickWeighted(rand, RISK_WEIGHTS).type;
    const segment = pickWeighted(rand, [
      { type: ClientSegment.INDIVIDUAL, weight: 62 },
      { type: ClientSegment.PROFESSIONAL, weight: 26 },
      { type: ClientSegment.COMPANY, weight: 12 },
    ]).type;
    const premium = 90 + rand() * (segment === ClientSegment.COMPANY ? 720 : 240);
    const rate = 0.08 + rand() * 0.12;
    const annualCommission = premium * rate;
    const ageJitter = spec.avgAgeMonths + (rand() - 0.5) * spec.avgAgeMonths * 0.5;
    const effectiveDate = addMonths(NOW, -Math.max(3, Math.round(ageJitter)));
    // Echeance principale : prochaine date anniversaire a venir. Un contrat en
    // vigueur se rejoue chaque annee, son echeance n'est donc jamais dans le
    // passe. C'est ce qui alimente l'echeancier des renouvellements.
    let renewalDate = addMonths(effectiveDate, 12);
    while (renewalDate.getTime() <= NOW.getTime()) {
      renewalDate = addMonths(renewalDate, 12);
    }
    const clientSeq = 1 + Math.floor(rand() * clientCount);

    lines.push({
      id: `${spec.id}_line_${String(i + 1).padStart(4, "0")}`,
      portfolioId: spec.id,
      carrier,
      riskType: risk,
      premium: money(premium),
      commissionRate: rate.toFixed(4),
      annualCommission: money(annualCommission),
      effectiveDate,
      renewalDate,
      clientSegment: segment,
      postalCode: pick(rand, zone.postalCodes),
      commissionType: rand() < spec.advancedShare ? CommissionType.ADVANCED : CommissionType.LINEAR,
      clientKey: `cli_${spec.id}_${String(clientSeq).padStart(4, "0")}`,
      department: zone.department,
      // Valeur au centime, identique a ce qui est enregistre : la somme des lignes
      // doit egaler exactement le total du portefeuille, sinon un acquereur
      // constate un ecart pendant la verification prealable.
      annualCommissionNumber: Number(money(annualCommission)),
    });
  }
  return lines;
}

const DEPARTMENT_LABELS: Record<string, string> = {
  "75": "Paris",
  "92": "Hauts-de-Seine",
  "69": "Rhône",
  "13": "Bouches-du-Rhône",
  "44": "Loire-Atlantique",
  "59": "Nord",
  "38": "Isère",
  "31": "Haute-Garonne",
  "35": "Ille-et-Vilaine",
  "67": "Bas-Rhin",
  "33": "Gironde",
  "45": "Loiret",
  "2A": "Corse-du-Sud",
  "83": "Var",
  "06": "Alpes-Maritimes",
  "34": "Hérault",
};

function displayedZoneFor(
  departments: string[],
  regionCodes: string[],
): { displayedZone: string; isNationwide: boolean } {
  const uniqueDept = [...new Set(departments)];
  const uniqueRegion = [...new Set(regionCodes)];
  if (uniqueDept.length >= 8 || uniqueRegion.length >= 4) {
    return { displayedZone: "Couverture nationale", isNationwide: true };
  }
  if (uniqueDept.length <= 2) {
    return {
      displayedZone: uniqueDept.map((d) => DEPARTMENT_LABELS[d] ?? d).join(", "),
      isNationwide: false,
    };
  }
  const regionNames = uniqueDept.map(
    (d) => GEO_ZONES.find((g) => g.department === d)?.region ?? d,
  );
  return { displayedZone: [...new Set(regionNames)].join(", "), isNationwide: false };
}

function saveValuation(
  breakdown: ValuationBreakdown,
  portfolioId: string,
  listingId?: string,
): Prisma.ValuationCreateManyInput {
  return {
    portfolioId,
    listingId: listingId ?? null,
    computedAt: NOW,
    grossValue: money(breakdown.grossValue),
    lowValue: money(breakdown.lowValue),
    midValue: money(breakdown.midValue),
    highValue: money(breakdown.highValue),
    qualityScore: breakdown.qualityScore,
    breakdown: breakdown as unknown as Prisma.InputJsonValue,
    algorithmVersion: ALGORITHM_VERSION,
  };
}

async function main() {
  prisma = await createPrismaClient();
  console.info("Seeding cession-courtage demo data…");
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await prisma.$transaction([
    prisma.dataRoomView.deleteMany(),
    prisma.dataRequest.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.message.deleteMany(),
    prisma.retentionReport.deleteMany(),
    prisma.document.deleteMany(),
    prisma.deal.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.match.deleteMany(),
    prisma.listingLine.deleteMany(),
    prisma.valuation.deleteMany(),
    prisma.listing.deleteMany(),
    prisma.buyerMandate.deleteMany(),
    prisma.contractLine.deleteMany(),
    prisma.portfolioImport.deleteMany(),
    prisma.portfolio.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.valuationMultiple.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.outboundEmail.deleteMany(),
    prisma.user.deleteMany(),
    prisma.firm.deleteMany(),
  ]);

  for (const [riskType, multiple] of Object.entries({
    HEALTH_INDIVIDUAL: 3.1,
    HEALTH_SENIOR: 2.9,
    HEALTH_GROUP: 3.3,
    PROFESSIONAL_MULTIRISK: 3.5,
    PROFESSIONAL_LIABILITY: 3.4,
    DECENNIAL: 3.0,
    PROVIDENT: 2.8,
    FUNERAL: 2.6,
    LEGAL_PROTECTION: 2.4,
    AUTO: 2.2,
    HOME: 2.3,
    MOTORCYCLE: 2.0,
    LANDLORD: 2.5,
    SAVINGS: 2.7,
    RETIREMENT: 2.7,
    FLEET: 3.2,
    LOAN_INSURANCE: 1.4,
    OTHER: 2.0,
  } as Record<RiskType, number>)) {
    await prisma.valuationMultiple.create({
      data: { riskType: riskType as RiskType, multiple: money(multiple), updatedById: null },
    });
  }

  await prisma.firm.create({
    data: {
      id: "firm_admin",
      legalName: "Plateforme Cession Courtage",
      siren: "890190001",
      legalForm: "SAS",
      address: "1 rue de la Bourse",
      postalCode: "75002",
      city: "Paris",
      department: "75",
      region: "Île-de-France",
      foundedAt: new Date("2024-01-15"),
      headcount: 6,
      annualRevenue: "0.00",
      distributionMode: DistributionMode.REMOTE,
      complianceScore: 100,
    },
  });

  for (const seller of SELLERS) {
    await prisma.firm.create({ data: { id: seller.firmId, ...seller.firm } });
    await prisma.user.create({
      data: {
        id: seller.id,
        email: seller.email,
        phone: seller.phone,
        passwordHash,
        role: UserRole.SELLER,
        oriasNumber: seller.orias,
        oriasVerifiedAt: daysAgo(40),
        firmId: seller.firmId,
        kycStatus: KycStatus.VERIFIED,
        createdAt: daysAgo(60),
        fullName: seller.fullName,
        emailVerified: daysAgo(59),
        publicAlias: seller.alias,
      },
    });
    await prisma.subscription.create({
      data: {
        userId: seller.id,
        plan: SubscriptionPlan.FREE,
        feeRate: SUCCESS_FEE_RATE.toFixed(4),
        dealQuota: FREE_PLAN_DEAL_QUOTA,
        dealsUsed: 0,
        status: SubscriptionStatus.ACTIVE,
        renewsAt: daysFromNow(300),
      },
    });
  }

  for (const buyer of BUYERS) {
    await prisma.firm.create({ data: { id: buyer.firmId, ...buyer.firm } });
    await prisma.user.create({
      data: {
        id: buyer.id,
        email: buyer.email,
        phone: buyer.phone,
        passwordHash,
        role: UserRole.BUYER,
        oriasNumber: buyer.orias,
        oriasVerifiedAt: daysAgo(30),
        firmId: buyer.firmId,
        kycStatus: KycStatus.VERIFIED,
        createdAt: daysAgo(50),
        fullName: buyer.fullName,
        emailVerified: daysAgo(49),
        publicAlias: buyer.alias,
      },
    });
    await prisma.subscription.create({
      data: {
        userId: buyer.id,
        plan: buyer.plan,
        // Le taux ne depend pas du forfait : seul le quota de dossiers change.
        feeRate: SUCCESS_FEE_RATE.toFixed(4),
        dealQuota: buyer.plan === SubscriptionPlan.GROWTH ? null : FREE_PLAN_DEAL_QUOTA,
        dealsUsed: buyer.plan === SubscriptionPlan.FREE ? 1 : 2,
        status: SubscriptionStatus.ACTIVE,
        renewsAt: daysFromNow(250),
      },
    });
  }

  await prisma.user.create({
    data: {
      id: "user_admin",
      email: "admin@cession-courtage.demo",
      phone: "+33185000000",
      passwordHash,
      role: UserRole.ADMIN,
      oriasNumber: "17009001",
      oriasVerifiedAt: daysAgo(400),
      firmId: "firm_admin",
      kycStatus: KycStatus.VERIFIED,
      createdAt: daysAgo(400),
      fullName: "Administration plateforme",
      emailVerified: daysAgo(400),
      publicAlias: "ADM",
    },
  });
  await prisma.subscription.create({
    data: {
      userId: "user_admin",
      plan: SubscriptionPlan.GROWTH,
      feeRate: "0.0000",
      dealQuota: null,
      dealsUsed: 0,
      status: SubscriptionStatus.ACTIVE,
      renewsAt: daysFromNow(365),
    },
  });

  await prisma.user.create({
    data: {
      id: "user_pending",
      email: "aurore.petit@nouveau-cabinet.demo",
      phone: "+33645120999",
      passwordHash,
      role: UserRole.SELLER,
      oriasNumber: "17001999",
      oriasVerifiedAt: null,
      kycStatus: KycStatus.NONE,
      createdAt: daysAgo(1),
      fullName: "Aurore Petit",
      emailVerified: daysAgo(1),
      publicAlias: "C999",
    },
  });
  await prisma.subscription.create({
    data: {
      userId: "user_pending",
      plan: SubscriptionPlan.FREE,
      feeRate: SUCCESS_FEE_RATE.toFixed(4),
      dealQuota: FREE_PLAN_DEAL_QUOTA,
      dealsUsed: 0,
      status: SubscriptionStatus.ACTIVE,
      renewsAt: daysFromNow(365),
    },
  });

  const portfolioLines = new Map<string, BuiltLine[]>();

  for (const spec of PORTFOLIO_SPECS) {
    const lines = buildLines(spec);
    portfolioLines.set(spec.id, lines);
    const annualCommissions =
      Math.round(lines.reduce((s, l) => s + l.annualCommissionNumber, 0) * 100) / 100;
    const clientCount = new Set(lines.map((l) => l.clientKey)).size;
    const fileName = `${spec.id.replace("pf_", "portefeuille-")}.csv`;

    await prisma.portfolio.create({
      data: {
        id: spec.id,
        firmId: spec.firmId,
        label: spec.label,
        contractCount: lines.length,
        clientCount,
        annualCommissions: money(annualCommissions),
        averageAgeMonths: spec.avgAgeMonths,
        churnRate12m: spec.churnRate.toFixed(4),
        importedAt: daysAgo(20 + spec.lineCount % 15),
        sourceFileName: fileName,
        sourceStorageKey: `imports/${spec.firmId}/${fileName}`,
        sourceSha256: sha256(fileName + spec.id),
      },
    });

    await prisma.portfolioImport.create({
      data: {
        id: `imp_${spec.id}`,
        userId: spec.sellerId,
        portfolioId: spec.id,
        originalFileName: fileName,
        storageKey: `imports/${spec.firmId}/${fileName}`,
        sha256: sha256(fileName + spec.id),
        mimeType: "text/csv",
        status: ImportStatus.COMPLETED,
        columnMapping: {
          carrier: "compagnie",
          riskType: "branche",
          premium: "prime_ttc",
          commissionRate: "taux_comm",
          annualCommission: "comm_annuelle",
          effectiveDate: "effet",
          renewalDate: "echeance",
          clientSegment: "segment",
          postalCode: "cp",
          commissionType: "type_comm",
          clientKey: "ref_client",
        },
        createdAt: daysAgo(21),
        completedAt: daysAgo(20),
      },
    });

    const payload: Prisma.ContractLineCreateManyInput[] = lines.map((l) => ({
      id: l.id,
      portfolioId: l.portfolioId,
      carrier: l.carrier,
      riskType: l.riskType,
      premium: l.premium,
      commissionRate: l.commissionRate,
      annualCommission: l.annualCommission,
      effectiveDate: l.effectiveDate,
      renewalDate: l.renewalDate,
      clientSegment: l.clientSegment,
      postalCode: l.postalCode,
      commissionType: l.commissionType,
      clientKey: l.clientKey,
      department: l.department,
    }));
    const chunk = 6;
    for (let i = 0; i < payload.length; i += chunk) {
      await prisma.contractLine.createMany({ data: payload.slice(i, i + chunk) });
    }
    console.info(`  portfolio ${spec.id}: ${lines.length} lines, ${money(annualCommissions)} € commissions`);
  }

  const listingDefs: {
    id: string;
    portfolioId: string;
    status: ListingStatus;
    isPartial: boolean;
    sellerSupportMonths: number;
    publishedAt: Date | null;
    offerWindowClosesAt: Date | null;
    askingFactor: number;
    partialCarrier?: string;
  }[] = [
    { id: "lst_01", portfolioId: "pf_01", status: ListingStatus.DRAFT, isPartial: false, sellerSupportMonths: 3, publishedAt: null, offerWindowClosesAt: null, askingFactor: 1 },
    { id: "lst_02", portfolioId: "pf_02", status: ListingStatus.PUBLISHED, isPartial: false, sellerSupportMonths: 6, publishedAt: daysAgo(12), offerWindowClosesAt: null, askingFactor: 1.02 },
    { id: "lst_03", portfolioId: "pf_03", status: ListingStatus.OFFERS_OPEN, isPartial: false, sellerSupportMonths: 3, publishedAt: daysAgo(8), offerWindowClosesAt: daysFromNow(13), askingFactor: 0.98 },
    { id: "lst_04", portfolioId: "pf_04", status: ListingStatus.OFFERS_OPEN, isPartial: true, sellerSupportMonths: 6, publishedAt: daysAgo(6), offerWindowClosesAt: daysFromNow(15), askingFactor: 1.0, partialCarrier: "April" },
    { id: "lst_05", portfolioId: "pf_05", status: ListingStatus.OFFERS_OPEN, isPartial: false, sellerSupportMonths: 0, publishedAt: daysAgo(22), offerWindowClosesAt: daysAgo(1), askingFactor: 0.95 },
    { id: "lst_06", portfolioId: "pf_06", status: ListingStatus.UNDER_NEGOTIATION, isPartial: false, sellerSupportMonths: 6, publishedAt: daysAgo(40), offerWindowClosesAt: daysAgo(19), askingFactor: 1.01 },
    { id: "lst_07", portfolioId: "pf_07", status: ListingStatus.UNDER_NEGOTIATION, isPartial: false, sellerSupportMonths: 0, publishedAt: daysAgo(35), offerWindowClosesAt: daysAgo(14), askingFactor: 0.9 },
    { id: "lst_08", portfolioId: "pf_08", status: ListingStatus.UNDER_NEGOTIATION, isPartial: false, sellerSupportMonths: 6, publishedAt: daysAgo(50), offerWindowClosesAt: daysAgo(29), askingFactor: 1.05 },
    { id: "lst_09", portfolioId: "pf_09", status: ListingStatus.SOLD, isPartial: false, sellerSupportMonths: 3, publishedAt: daysAgo(200), offerWindowClosesAt: daysAgo(179), askingFactor: 1.0 },
    { id: "lst_10", portfolioId: "pf_10", status: ListingStatus.WITHDRAWN, isPartial: false, sellerSupportMonths: 3, publishedAt: daysAgo(18), offerWindowClosesAt: null, askingFactor: 1.1 },
  ];

  const listingAsk = new Map<string, number>();

  for (const def of listingDefs) {
    const spec = PORTFOLIO_SPECS.find((p) => p.id === def.portfolioId)!;
    const firm = SELLERS.find((s) => s.firmId === spec.firmId)!.firm;
    let lines = portfolioLines.get(def.portfolioId)!;
    if (def.isPartial && def.partialCarrier) {
      const subset = lines.filter((l) => l.carrier === def.partialCarrier);
      lines = subset.length >= 12 ? subset : lines.slice(0, Math.ceil(lines.length * 0.35));
    }
    const breakdown = computeSeedValuation(
      lines.map((l) => ({
        carrier: l.carrier,
        riskType: l.riskType,
        annualCommission: l.annualCommissionNumber,
        commissionType: l.commissionType,
        clientKey: l.clientKey,
        effectiveDate: l.effectiveDate,
      })),
      firm,
      def.sellerSupportMonths,
      spec.churnRate,
      spec.avgAgeMonths,
    );
    const asking = Math.round(breakdown.midValue * def.askingFactor);
    listingAsk.set(def.id, asking);
    const departments = [...new Set(lines.map((l) => l.department))];
    const regions = departments.map((d) => GEO_ZONES.find((g) => g.department === d)?.regionCode ?? d);
    const zone = displayedZoneFor(departments, regions);
    const listingOrdinal = Number.parseInt(def.id.replace("lst_", ""), 10);

    await prisma.listing.create({
      data: {
        id: def.id,
        portfolioId: def.portfolioId,
        askingPrice: money(asking),
        displayedZone: zone.displayedZone,
        status: def.status,
        isPartial: def.isPartial,
        publishedAt: def.publishedAt,
        offerWindowClosesAt: def.offerWindowClosesAt,
        sellerSupportMonths: def.sellerSupportMonths,
        publicNumber: 10_000 + listingOrdinal,
        departments,
        regions: [...new Set(regions)],
        isNationwide: zone.isNationwide,
        createdAt: def.publishedAt ?? daysAgo(3),
      },
    });

    if (def.isPartial) {
      await prisma.listingLine.createMany({
        data: lines.map((l) => ({ listingId: def.id, contractLineId: l.id })),
      });
    }

    await prisma.valuation.create({
      data: saveValuation(breakdown, def.portfolioId, def.id),
    });
  }

  await prisma.firm.create({
    data: {
      id: CATALOG_FIRM.id,
      legalName: CATALOG_FIRM.legalName,
      siren: CATALOG_FIRM.siren,
      legalForm: CATALOG_FIRM.legalForm,
      address: CATALOG_FIRM.address,
      postalCode: CATALOG_FIRM.postalCode,
      city: CATALOG_FIRM.city,
      department: CATALOG_FIRM.department,
      region: CATALOG_FIRM.region,
      foundedAt: new Date(CATALOG_FIRM.foundedAt),
      headcount: CATALOG_FIRM.headcount,
      annualRevenue: CATALOG_FIRM.annualRevenue,
      distributionMode: DistributionMode.REMOTE,
      complianceScore: CATALOG_FIRM.complianceScore,
    },
  });

  for (const row of buildCatalogListings()) {
    await prisma.portfolio.create({
      data: {
        id: row.portfolioId,
        firmId: row.firmId,
        label: row.label,
        contractCount: row.contractCount,
        clientCount: row.clientCount,
        annualCommissions: row.annualCommissions,
        averageAgeMonths: row.averageAgeMonths,
        churnRate12m: row.churnRate12m,
        importedAt: new Date(row.publishedAt),
      },
    });
    await prisma.contractLine.createMany({
      data: row.lines.map((line) => ({
        id: line.id,
        portfolioId: row.portfolioId,
        carrier: line.carrier,
        riskType: line.riskType as RiskType,
        premium: line.premium,
        commissionRate: line.commissionRate,
        annualCommission: line.annualCommission,
        effectiveDate: new Date(line.effectiveDate),
        renewalDate: new Date(line.renewalDate),
        clientSegment: line.clientSegment as ClientSegment,
        postalCode: line.postalCode,
        commissionType: line.commissionType as CommissionType,
        clientKey: line.clientKey,
        department: line.department,
      })),
    });
    await prisma.listing.create({
      data: {
        id: row.listingId,
        portfolioId: row.portfolioId,
        askingPrice: row.askingPrice,
        displayedZone: row.displayedZone,
        status: ListingStatus.OFFERS_OPEN,
        isPartial: row.isPartial,
        publishedAt: new Date(row.publishedAt),
        offerWindowClosesAt: new Date(row.offerWindowClosesAt),
        publicNumber: row.publicNumber,
        sellerSupportMonths: row.sellerSupportMonths,
        departments: JSON.parse(row.departmentsJson) as string[],
        regions: JSON.parse(row.regionsJson) as string[],
        isNationwide: row.isNationwide,
        createdAt: new Date(row.publishedAt),
      },
    });
  }

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE Listing SET certificationStatus = 'CERTIFIED' WHERE id LIKE 'lst_catalog_%' AND CAST(substr(id, 13) AS INTEGER) % 7 = 0`,
    );
  } catch (error) {
    console.warn("catalog certification skipped", error);
  }
  console.info("  catalog: 80 public listings (10101-10180)");

  // Chaque portefeuille porte sa propre valorisation, independamment de toute
  // annonce. Une valorisation rattachee a une annonce ne vaut que pour le
  // sous-ensemble mis en vente : elle ne remplace pas celle du portefeuille.
  for (const spec of PORTFOLIO_SPECS) {
    const lines = portfolioLines.get(spec.id)!;
    const firm = SELLERS.find((s) => s.firmId === spec.firmId)!.firm;
    const breakdown = computeSeedValuation(
      lines.map((l) => ({
        carrier: l.carrier,
        riskType: l.riskType,
        annualCommission: l.annualCommissionNumber,
        commissionType: l.commissionType,
        clientKey: l.clientKey,
        effectiveDate: l.effectiveDate,
      })),
      firm,
      0,
      spec.churnRate,
      spec.avgAgeMonths,
    );
    await prisma.valuation.create({ data: saveValuation(breakdown, spec.id) });
  }

  const mandates: Prisma.BuyerMandateCreateManyInput[] = [
    {
      id: "man_01",
      buyerId: "user_buyer_01",
      maxBudget: "180000.00",
      minCommissions: "15000.00",
      maxCommissions: "90000.00",
      riskTypes: [RiskType.HEALTH_INDIVIDUAL, RiskType.HEALTH_GROUP, RiskType.PROVIDENT, RiskType.LOAN_INSURANCE],
      carriers: ["AXA", "Allianz", "Swiss Life", "April"],
      zones: ["IDF", "75", "92"],
      clientSegments: [ClientSegment.INDIVIDUAL, ClientSegment.PROFESSIONAL],
      financingMode: FinancingMode.BOTH,
      alertsEnabled: true,
    },
    {
      id: "man_02",
      buyerId: "user_buyer_02",
      maxBudget: "90000.00",
      minCommissions: "8000.00",
      maxCommissions: "50000.00",
      riskTypes: [RiskType.AUTO, RiskType.HOME, RiskType.MOTORCYCLE, RiskType.PROFESSIONAL_MULTIRISK],
      carriers: ["AXA", "Generali", "April", "Alptis"],
      zones: ["PACA", "13", "83", "06"],
      clientSegments: [ClientSegment.INDIVIDUAL, ClientSegment.PROFESSIONAL, ClientSegment.COMPANY],
      financingMode: FinancingMode.CASH,
      alertsEnabled: true,
    },
    {
      id: "man_03",
      buyerId: "user_buyer_03",
      maxBudget: "120000.00",
      minCommissions: "20000.00",
      maxCommissions: "80000.00",
      riskTypes: [RiskType.HEALTH_INDIVIDUAL, RiskType.HEALTH_SENIOR, RiskType.PROVIDENT, RiskType.FUNERAL],
      carriers: ["Alptis", "Néoliane", "April", "Spvie"],
      zones: ["ARA", "69", "38"],
      clientSegments: [ClientSegment.INDIVIDUAL],
      financingMode: FinancingMode.BOTH,
      alertsEnabled: true,
    },
    {
      id: "man_04",
      buyerId: "user_buyer_04",
      maxBudget: "200000.00",
      minCommissions: "10000.00",
      maxCommissions: "100000.00",
      riskTypes: [RiskType.PROFESSIONAL_MULTIRISK, RiskType.PROFESSIONAL_LIABILITY, RiskType.DECENNIAL, RiskType.FLEET],
      carriers: ["AXA", "Allianz", "Generali", "Entoria"],
      zones: ["PDL", "BRE", "44", "35"],
      clientSegments: [ClientSegment.PROFESSIONAL, ClientSegment.COMPANY],
      financingMode: FinancingMode.CREDIT,
      alertsEnabled: true,
    },
    {
      id: "man_05",
      buyerId: "user_buyer_05",
      maxBudget: "150000.00",
      minCommissions: "5000.00",
      maxCommissions: "70000.00",
      riskTypes: [RiskType.HEALTH_INDIVIDUAL, RiskType.LOAN_INSURANCE, RiskType.SAVINGS, RiskType.RETIREMENT],
      carriers: ["Swiss Life", "Generali", "April", "Netvox", "Zephir"],
      zones: ["NATIONAL"],
      clientSegments: [ClientSegment.INDIVIDUAL, ClientSegment.PROFESSIONAL, ClientSegment.COMPANY],
      financingMode: FinancingMode.BOTH,
      alertsEnabled: true,
    },
    {
      id: "man_06",
      buyerId: "user_buyer_06",
      maxBudget: "45000.00",
      minCommissions: "3000.00",
      maxCommissions: "25000.00",
      riskTypes: [RiskType.HEALTH_INDIVIDUAL, RiskType.HEALTH_SENIOR, RiskType.HEALTH_GROUP],
      carriers: ["Alptis", "Néoliane", "April", "Solly Azar"],
      zones: ["OCC", "31", "34"],
      clientSegments: [ClientSegment.INDIVIDUAL, ClientSegment.PROFESSIONAL],
      financingMode: FinancingMode.CASH,
      alertsEnabled: false,
    },
  ];
  await prisma.buyerMandate.createMany({ data: mandates });

  // Publie une partie des mandats comme demandes d'acquisition : le catalogue
  // reste vivant meme quand peu de cedants ont publie.
  const published = mandates.slice(0, 5);
  let mandateNumber = FIRST_MANDATE_PUBLIC_NUMBER;
  for (const mandate of published) {
    await prisma.buyerMandate.update({
      where: { id: String(mandate.id) },
      data: { isPublic: true, publicNumber: mandateNumber },
    });
    mandateNumber += 1;
  }

  const offers: Prisma.OfferCreateManyInput[] = [
    { id: "off_01", listingId: "lst_03", buyerId: "user_buyer_02", amount: money((listingAsk.get("lst_03") ?? 0) * 0.92), upfrontPercent: "70.00", message: "Offre ferme, paiement majoritairement comptant, reprise possible sous 45 jours.", status: OfferStatus.SUBMITTED, submittedAt: daysAgo(3) },
    { id: "off_02", listingId: "lst_03", buyerId: "user_buyer_05", amount: money((listingAsk.get("lst_03") ?? 0) * 0.97), upfrontPercent: "50.00", message: "Intéressés par le mix emprunteur / santé. Accompagnement de 3 mois souhaité.", status: OfferStatus.SUBMITTED, submittedAt: daysAgo(2) },
    { id: "off_03", listingId: "lst_03", buyerId: "user_buyer_01", amount: money((listingAsk.get("lst_03") ?? 0) * 1.01), upfrontPercent: "80.00", message: "Nous couvrons déjà la PACA. Synergie portefeuille existante.", status: OfferStatus.SUBMITTED, submittedAt: daysAgo(1) },
    { id: "off_04", listingId: "lst_04", buyerId: "user_buyer_04", amount: money((listingAsk.get("lst_04") ?? 0) * 0.94), upfrontPercent: "60.00", message: "Cible April uniquement, cohérent avec notre stock grossiste.", status: OfferStatus.SUBMITTED, submittedAt: daysAgo(2) },
    { id: "off_05", listingId: "lst_04", buyerId: "user_buyer_05", amount: money((listingAsk.get("lst_04") ?? 0) * 0.88), upfrontPercent: "100.00", message: "Proposition 100 % comptant pour une cession rapide.", status: OfferStatus.SUBMITTED, submittedAt: daysAgo(1) },
    { id: "off_06", listingId: "lst_05", buyerId: "user_buyer_01", amount: money((listingAsk.get("lst_05") ?? 0) * 0.82), upfrontPercent: "70.00", message: "Décote liée à la concentration AXA. Prêts à discuter un earn-out.", status: OfferStatus.SUBMITTED, submittedAt: daysAgo(5) },
    { id: "off_07", listingId: "lst_05", buyerId: "user_buyer_07", amount: money((listingAsk.get("lst_05") ?? 0) * 0.91), upfrontPercent: "55.00", message: "Ancrage Nord, reprise d'agence envisageable.", status: OfferStatus.SUBMITTED, submittedAt: daysAgo(4) },
    { id: "off_08", listingId: "lst_05", buyerId: "user_buyer_05", amount: money((listingAsk.get("lst_05") ?? 0) * 0.87), upfrontPercent: "40.00", message: "Financement crédit + complément à 12 mois.", status: OfferStatus.SUBMITTED, submittedAt: daysAgo(3) },
    { id: "off_09", listingId: "lst_05", buyerId: "user_buyer_03", amount: money((listingAsk.get("lst_05") ?? 0) * 0.79), upfrontPercent: "90.00", message: "Offre conservatrice au vu du churn et de la concentration.", status: OfferStatus.SUBMITTED, submittedAt: daysAgo(2) },
    { id: "off_10", listingId: "lst_06", buyerId: "user_buyer_03", amount: money((listingAsk.get("lst_06") ?? 0) * 0.96), upfrontPercent: "65.00", message: "Offre retenue pour ouverture de dossier.", status: OfferStatus.ACCEPTED, submittedAt: daysAgo(20) },
    { id: "off_11", listingId: "lst_06", buyerId: "user_buyer_01", amount: money((listingAsk.get("lst_06") ?? 0) * 0.9), upfrontPercent: "50.00", message: "Proposition alternative, non retenue.", status: OfferStatus.DECLINED, submittedAt: daysAgo(21) },
    { id: "off_12", listingId: "lst_07", buyerId: "user_buyer_06", amount: money((listingAsk.get("lst_07") ?? 0) * 0.85), upfrontPercent: "70.00", message: "Vente à distance santé Occitanie, bon complément de notre portefeuille.", status: OfferStatus.ACCEPTED, submittedAt: daysAgo(16) },
    { id: "off_13", listingId: "lst_08", buyerId: "user_buyer_04", amount: money((listingAsk.get("lst_08") ?? 0) * 1.0), upfrontPercent: "60.00", message: "Portefeuille historique Bretagne, aligné sur notre réseau d'agences.", status: OfferStatus.ACCEPTED, submittedAt: daysAgo(30) },
    { id: "off_14", listingId: "lst_09", buyerId: "user_buyer_02", amount: money((listingAsk.get("lst_09") ?? 0) * 0.97), upfrontPercent: "75.00", message: "Dossier clôturé, offre d'origine.", status: OfferStatus.ACCEPTED, submittedAt: daysAgo(185) },
    { id: "off_15", listingId: "lst_02", buyerId: "user_buyer_03", amount: money((listingAsk.get("lst_02") ?? 0) * 0.93), upfrontPercent: "80.00", message: "Marquage d'intérêt avant ouverture de la fenêtre d'offres.", status: OfferStatus.SUBMITTED, submittedAt: daysAgo(4) },
  ];
  await prisma.offer.createMany({ data: offers });

  const matchRows: Prisma.MatchCreateManyInput[] = [
    { id: "match_01", listingId: "lst_02", mandateId: "man_03", score: 78, criteriaBreakdown: { budget: 28, risks: 18, carriers: 9, zone: 20, segments: 8 }, status: MatchStatus.VIEWED, notifiedAt: daysAgo(11) },
    { id: "match_02", listingId: "lst_03", mandateId: "man_02", score: 81, criteriaBreakdown: { budget: 30, risks: 16, carriers: 12, zone: 20, segments: 10 }, status: MatchStatus.CONTACTED, notifiedAt: daysAgo(8) },
    { id: "match_03", listingId: "lst_03", mandateId: "man_05", score: 64, criteriaBreakdown: { budget: 24, risks: 12, carriers: 8, zone: 5, segments: 10 }, status: MatchStatus.VIEWED, notifiedAt: daysAgo(8) },
    { id: "match_04", listingId: "lst_04", mandateId: "man_04", score: 72, criteriaBreakdown: { budget: 26, risks: 20, carriers: 10, zone: 12, segments: 8 }, status: MatchStatus.SUGGESTED, notifiedAt: daysAgo(6) },
    { id: "match_05", listingId: "lst_05", mandateId: "man_01", score: 58, criteriaBreakdown: { budget: 18, risks: 10, carriers: 12, zone: 12, segments: 8 }, status: MatchStatus.VIEWED, notifiedAt: daysAgo(21) },
    { id: "match_06", listingId: "lst_07", mandateId: "man_06", score: 86, criteriaBreakdown: { budget: 30, risks: 25, carriers: 12, zone: 12, segments: 8 }, status: MatchStatus.CONTACTED, notifiedAt: daysAgo(34) },
    { id: "match_07", listingId: "lst_08", mandateId: "man_04", score: 69, criteriaBreakdown: { budget: 22, risks: 15, carriers: 8, zone: 20, segments: 7 }, status: MatchStatus.CONTACTED, notifiedAt: daysAgo(49) },
  ];
  await prisma.match.createMany({ data: matchRows });

  for (const match of matchRows) {
    const mandate = mandates.find((m) => m.id === match.mandateId)!;
    await prisma.notification.create({
      data: {
        userId: mandate.buyerId as string,
        type: NotificationType.MATCH,
        title: "Nouvelle correspondance de portefeuille",
        body: `Une annonce correspond à votre mandat de recherche (score ${match.score}/100).`,
        href: `/app/opportunites`,
        matchId: match.id,
        createdAt: match.notifiedAt as Date,
      },
    });
  }

  const dealNdaPrice = listingAsk.get("lst_06")! * 0.96;
  const dealRoomPrice = listingAsk.get("lst_07")! * 0.85;
  const dealLoiPrice = listingAsk.get("lst_08")! * 1.0;
  const dealClosedPrice = listingAsk.get("lst_09")! * 0.97;

  await prisma.deal.createMany({
    data: [
      {
        id: "deal_nda",
        listingId: "lst_06",
        sellerId: "user_seller_06",
        buyerId: "user_buyer_03",
        agreedPrice: money(dealNdaPrice),
        upfrontAmount: money(dealNdaPrice * 0.65),
        deferredAmount: money(dealNdaPrice * 0.35),
        stage: DealStage.NDA,
        createdAt: daysAgo(12),
        sellerAlias: "Cédant #C41",
        buyerAlias: "Acquéreur #A27",
        escrowStage: EscrowStage.NONE,
      },
      {
        id: "deal_dataroom",
        listingId: "lst_07",
        sellerId: "user_seller_07",
        buyerId: "user_buyer_06",
        agreedPrice: money(dealRoomPrice),
        upfrontAmount: money(dealRoomPrice * 0.7),
        deferredAmount: money(dealRoomPrice * 0.3),
        stage: DealStage.DATA_ROOM,
        createdAt: daysAgo(14),
        sellerAlias: "Cédant #C48",
        buyerAlias: "Acquéreur #A47",
        ndaAcceptedAt: daysAgo(13),
        escrowStage: EscrowStage.NONE,
      },
      {
        id: "deal_loi",
        listingId: "lst_08",
        sellerId: "user_seller_08",
        buyerId: "user_buyer_04",
        agreedPrice: money(dealLoiPrice),
        upfrontAmount: money(dealLoiPrice * 0.6),
        deferredAmount: money(dealLoiPrice * 0.4),
        stage: DealStage.LOI,
        createdAt: daysAgo(22),
        sellerAlias: "Cédant #C52",
        buyerAlias: "Acquéreur #A33",
        ndaAcceptedAt: daysAgo(21),
        escrowStage: EscrowStage.FUNDS_HELD,
        escrowProviderRef: "mock_escrow_loi_08",
      },
      {
        id: "deal_closed",
        listingId: "lst_09",
        sellerId: "user_seller_09",
        buyerId: "user_buyer_02",
        agreedPrice: money(dealClosedPrice),
        upfrontAmount: money(dealClosedPrice * 0.75),
        deferredAmount: money(dealClosedPrice * 0.25),
        stage: DealStage.CLOSED,
        createdAt: daysAgo(170),
        sellerAlias: "Cédant #C59",
        buyerAlias: "Acquéreur #A19",
        ndaAcceptedAt: daysAgo(168),
        adjustedDeferredAmount: money(
          adjustedDeferredAmount({
            deferredAmount: dealClosedPrice * 0.25,
            retentionRate: 0.93,
          }),
        ),
        escrowStage: EscrowStage.RELEASED,
        escrowProviderRef: "mock_escrow_closed_09",
      },
    ],
  });

  await prisma.document.createMany({
    data: [
      { id: "doc_nda_07", dealId: "deal_dataroom", type: DocumentType.NDA, fileName: "accord-confidentialite.pdf", storageKey: "deals/deal_dataroom/nda.pdf", sha256: sha256("nda-dataroom"), uploadedById: "user_seller_07", signedAt: daysAgo(13) },
      { id: "doc_other_07", dealId: "deal_dataroom", type: DocumentType.OTHER, fileName: "repartition-compagnies.xlsx", storageKey: "deals/deal_dataroom/repartition.xlsx", sha256: sha256("xlsx-dataroom"), uploadedById: "user_seller_07" },
      { id: "doc_nda_08", dealId: "deal_loi", type: DocumentType.NDA, fileName: "nda-signe.pdf", storageKey: "deals/deal_loi/nda.pdf", sha256: sha256("nda-loi"), uploadedById: "user_seller_08", signedAt: daysAgo(21) },
      { id: "doc_loi_08", dealId: "deal_loi", type: DocumentType.LOI, fileName: "lettre-intention.pdf", storageKey: "deals/deal_loi/loi.pdf", sha256: sha256("loi-08"), uploadedById: "user_buyer_04", signedAt: daysAgo(5) },
      { id: "doc_deed_09", dealId: "deal_closed", type: DocumentType.DEED, fileName: "acte-cession.pdf", storageKey: "deals/deal_closed/acte.pdf", sha256: sha256("deed-09"), uploadedById: "user_seller_09", signedAt: daysAgo(155) },
      { id: "doc_cert_09", dealId: "deal_closed", type: DocumentType.TRANSFER_CERTIFICATE, fileName: "attestation-transfert.pdf", storageKey: "deals/deal_closed/attestation.pdf", sha256: sha256("cert-09"), uploadedById: "user_admin", signedAt: daysAgo(150) },
    ],
  });

  const closedLines = portfolioLines.get("pf_09")!;
  const transferred = closedLines.length;
  await prisma.retentionReport.createMany({
    data: [
      { dealId: "deal_closed", monthIndex: 3, contractsRetained: Math.round(transferred * 0.97), contractsTransferred: transferred, actualCommissions: money(closedLines.reduce((s, l) => s + l.annualCommissionNumber, 0) * 0.24), retentionRate: "0.9700", reportedAt: daysAgo(80) },
      { dealId: "deal_closed", monthIndex: 6, contractsRetained: Math.round(transferred * 0.95), contractsTransferred: transferred, actualCommissions: money(closedLines.reduce((s, l) => s + l.annualCommissionNumber, 0) * 0.47), retentionRate: "0.9500", reportedAt: daysAgo(40) },
      { dealId: "deal_closed", monthIndex: 12, contractsRetained: Math.round(transferred * 0.93), contractsTransferred: transferred, actualCommissions: money(closedLines.reduce((s, l) => s + l.annualCommissionNumber, 0) * 0.91), retentionRate: "0.9300", reportedAt: daysAgo(5) },
    ],
  });

  await prisma.message.createMany({
    data: [
      { dealId: "deal_nda", senderId: "user_buyer_03", body: "Bonjour, nous confirmons notre intérêt. Merci de nous transmettre l'accord de confidentialité pour ouvrir les échanges.", createdAt: daysAgo(11) },
      { dealId: "deal_nda", senderId: "user_seller_06", body: "Accord en cours de préparation. Nous revenons vers vous sous 48 heures.", createdAt: daysAgo(10) },
      { dealId: "deal_dataroom", senderId: "user_seller_07", body: "L'accord de confidentialité est signé. La salle de données contient la répartition par compagnie (aucune donnée nominative).", createdAt: daysAgo(12) },
      { dealId: "deal_dataroom", senderId: "user_buyer_06", body: "Merci. Nous examinons le fichier de répartition et reviendrons avec nos questions de due diligence.", createdAt: daysAgo(11) },
      { dealId: "deal_loi", senderId: "user_buyer_04", body: "Lettre d'intention déposée. Nous proposons un rendez-vous pour caler le calendrier de transfert des codes de production.", createdAt: daysAgo(6) },
      { listingId: "lst_05", senderId: "user_seller_05", recipientId: "user_buyer_01", body: "La fenêtre d'offres est close. Nous comparons les propositions reçues et reviendrons vers les acquéreurs retenus.", createdAt: daysAgo(1) },
    ],
  });

  await prisma.dataRoomView.createMany({
    data: [
      { dealId: "deal_dataroom", viewerId: "user_buyer_06", documentId: "doc_other_07", viewedAt: daysAgo(11) },
      { dealId: "deal_dataroom", viewerId: "user_buyer_06", documentId: "doc_other_07", viewedAt: daysAgo(10) },
      { dealId: "deal_loi", viewerId: "user_buyer_04", documentId: "doc_loi_08", viewedAt: daysAgo(5) },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { actorId: "user_buyer_06", action: "DATA_ROOM_VIEW", entityType: "Document", entityId: "doc_other_07", metadata: { dealId: "deal_dataroom" }, ipAddress: "203.0.113.10", createdAt: daysAgo(11) },
      { actorId: "user_buyer_04", action: "IDENTIFYING_DATA_VIEW", entityType: "Deal", entityId: "deal_loi", metadata: { reason: "stage_loi" }, ipAddress: "203.0.113.22", createdAt: daysAgo(5) },
      { actorId: "user_admin", action: "ORIAS_VERIFY", entityType: "User", entityId: "user_seller_01", metadata: { oriasNumber: "17001001" }, createdAt: daysAgo(40) },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: "user_seller_05", type: NotificationType.OFFER_WINDOW_CLOSED, title: "Fenêtre d'offres close", body: "Vous pouvez désormais comparer les offres reçues sur le dossier Nord , concentration AXA.", href: "/app/annonces/lst_05/offres", createdAt: daysAgo(1) },
      { userId: "user_buyer_02", type: NotificationType.RETENTION_DUE, title: "Déclaration de rétention M+12", body: "Merci de confirmer les contrats conservés et les commissions encaissées à 12 mois.", href: "/app/dossiers/deal_closed/retention", createdAt: daysAgo(8) },
    ],
  });

  // Suivi des codes de courtage : etat realiste par portefeuille.
  // Les compagnies sont tirees des lignes reellement importees, jamais inventees,
  // pour que le suivi corresponde toujours au portefeuille.
  const codeStates: { portfolioId: string; agreed: number; notified: number; refused: number }[] = [
    { portfolioId: "pf_02", agreed: 4, notified: 2, refused: 0 },
    { portfolioId: "pf_03", agreed: 3, notified: 1, refused: 0 },
    { portfolioId: "pf_05", agreed: 2, notified: 2, refused: 1 },
    { portfolioId: "pf_07", agreed: 5, notified: 1, refused: 0 },
    { portfolioId: "pf_08", agreed: 6, notified: 0, refused: 0 },
    { portfolioId: "pf_09", agreed: 7, notified: 0, refused: 0 },
  ];

  let carrierCodeCount = 0;
  for (const state of codeStates) {
    const carriers = await prisma.contractLine.findMany({
      where: { portfolioId: state.portfolioId },
      select: { carrier: true },
      distinct: ["carrier"],
      orderBy: { carrier: "asc" },
    });
    let index = 0;
    const rows: {
      portfolioId: string;
      carrier: string;
      status: CarrierCodeStatus;
      notifiedAt: Date | null;
      decidedAt: Date | null;
      note: string | null;
    }[] = [];

    for (const { carrier } of carriers) {
      let status: CarrierCodeStatus = CarrierCodeStatus.PENDING;
      let note: string | null = null;
      if (index < state.refused) {
        status = CarrierCodeStatus.REFUSED;
        note = "La compagnie refuse la réattribution du code au repreneur.";
      } else if (index < state.refused + state.agreed) {
        status = CarrierCodeStatus.AGREED;
      } else if (index < state.refused + state.agreed + state.notified) {
        status = CarrierCodeStatus.NOTIFIED;
        note = "Courrier d'information envoyé, réponse attendue.";
      }
      const decided =
        status === CarrierCodeStatus.AGREED || status === CarrierCodeStatus.REFUSED;
      rows.push({
        portfolioId: state.portfolioId,
        carrier,
        status,
        notifiedAt: status === CarrierCodeStatus.PENDING ? null : daysAgo(30 - index),
        decidedAt: decided ? daysAgo(12 - Math.min(index, 10)) : null,
        note,
      });
      index += 1;
    }
    for (const row of rows) {
      await prisma.carrierCode.create({ data: row });
      carrierCodeCount += 1;
    }
  }

  // Bordereau de pieces des dossiers ouverts, partiellement rempli.
  let dueDiligenceCount = 0;
  const deals = await prisma.deal.findMany({ select: { id: true, listingId: true } });
  for (const deal of deals) {
    const listing = await prisma.listing.findUnique({
      where: { id: deal.listingId },
      select: { portfolioId: true },
    });
    if (!listing) continue;
    const carriers = await prisma.contractLine.findMany({
      where: { portfolioId: listing.portfolioId },
      select: { carrier: true },
      distinct: ["carrier"],
      orderBy: { carrier: "asc" },
      take: 4,
    });
    const hasDecennial =
      (await prisma.contractLine.count({
        where: { portfolioId: listing.portfolioId, riskType: RiskType.DECENNIAL },
      })) > 0;

    const entries = buildChecklist(
      carriers.map((c) => c.carrier),
      hasDecennial,
    );
    let i = 0;
    for (const entry of entries) {
      await prisma.dueDiligenceItem.create({
        data: {
          dealId: deal.id,
          category: entry.category as DueDiligenceCategory,
          label: entry.label,
          required: entry.required,
          // Un dossier en cours a environ la moitie de ses pieces deposees.
          providedAt: i % 2 === 0 ? daysAgo(20 - (i % 15)) : null,
        },
      });
      dueDiligenceCount += 1;
      i += 1;
    }
  }

  const userCount = await prisma.user.count();
  const lineCount = await prisma.contractLine.count();
  const listingCount = await prisma.listing.count();
  const offerCount = await prisma.offer.count();
  const dealCount = await prisma.deal.count();
  console.info(`Done. users=${userCount} lines=${lineCount} listings=${listingCount} offers=${offerCount} deals=${dealCount} carrierCodes=${carrierCodeCount} dueDiligence=${dueDiligenceCount}`);
  console.info(`Demo password for every account: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma?.$disconnect();
    await disposePlatform?.();
  });
