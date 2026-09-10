/**
 * Catalogue de demonstration : ~80 fiches publiques, sans PII nominative.
 * Zone = departement ou region. Alias Portefeuille #10101+.
 */

export const CATALOG_FIRM_ID = "firm_catalog";
export const CATALOG_COUNT = 80;
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
  publishedAt: string;
  offerWindowClosesAt: string;
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
    const isPartial = i % 11 === 0;
    const certified = i % 7 === 0;
    const support = [0, 3, 6][i % 3]!;
    const contracts = 48 + ((i * 17) % 320);
    const clients = Math.max(12, Math.round(contracts * 0.62));
    const commissions = 12_000 + ((i * 2_830) % 68_000);
    const asking = Math.min(198_000, Math.max(8_000, Math.round(commissions * (2.15 + (i % 9) * 0.08))));
    const roundedAsk = Math.round(asking / 500) * 500;
    const roundedComm = Math.round(commissions * 100) / 100;
    const publishedAt = isoDaysFrom(CATALOG_NOW, -(i % 45));
    const windowOpen = i % 5 !== 0;
    const offerWindowClosesAt = isoDaysFrom(publishedAt, windowOpen ? 21 : -2);

    const riskA = RISKS[(i - 1) % RISKS.length]!;
    const riskB = RISKS[(i + 4) % RISKS.length]!;
    const carrierA = CARRIERS[(i - 1) % CARRIERS.length]!;
    const carrierB = CARRIERS[(i + 3) % CARRIERS.length]!;
    const segmentA = SEGMENTS[i % SEGMENTS.length]!;
    const segmentB = SEGMENTS[(i + 1) % SEGMENTS.length]!;
    const commA = Math.round(roundedComm * 0.62 * 100) / 100;
    const commB = Math.round((roundedComm - commA) * 100) / 100;
    const rateA = 0.12 + (i % 8) * 0.01;
    const rateB = 0.1 + (i % 6) * 0.01;

    const departments = nationwide
      ? ZONES.slice(0, 8).map((z) => z.department)
      : [zone.department];
    const regionCodes = nationwide
      ? [...new Set(ZONES.slice(0, 8).map((z) => z.regionCode))]
      : [zone.regionCode];

    const displayedZone = nationwide ? "Couverture nationale" : zone.label;

    const lines: CatalogContractLine[] = [
      {
        id: `cl_catalog_${pad}_a`,
        carrier: carrierA,
        riskType: riskA,
        premium: (commA / rateA).toFixed(2),
        commissionRate: rateA.toFixed(4),
        annualCommission: commA.toFixed(2),
        annualCommissionNumber: commA,
        effectiveDate: isoDaysFrom(CATALOG_NOW, -400 - i),
        renewalDate: isoDaysFrom(CATALOG_NOW, 20 + (i % 200)),
        clientSegment: segmentA,
        postalCode: zone.postal,
        commissionType: i % 9 === 0 ? "ADVANCED" : "LINEAR",
        clientKey: `ck_catalog_${pad}_a`,
        department: zone.department,
      },
      {
        id: `cl_catalog_${pad}_b`,
        carrier: carrierB,
        riskType: riskB,
        premium: (commB / rateB).toFixed(2),
        commissionRate: rateB.toFixed(4),
        annualCommission: commB.toFixed(2),
        annualCommissionNumber: commB,
        effectiveDate: isoDaysFrom(CATALOG_NOW, -280 - i),
        renewalDate: isoDaysFrom(CATALOG_NOW, 40 + (i % 180)),
        clientSegment: segmentB,
        postalCode: zone.postal,
        commissionType: "LINEAR",
        clientKey: `ck_catalog_${pad}_b`,
        department: zone.department,
      },
    ];

    rows.push({
      pad,
      listingId: `lst_catalog_${pad}`,
      portfolioId: `pf_catalog_${pad}`,
      publicNumber: CATALOG_PUBLIC_NUMBER_START + i - 1,
      firmId: CATALOG_FIRM_ID,
      label: `Catalogue ${displayedZone} ${pad}`,
      contractCount: contracts,
      clientCount: clients,
      annualCommissions: roundedComm.toFixed(2),
      averageAgeMonths: 18 + (i % 40),
      churnRate12m: (0.04 + (i % 10) * 0.004).toFixed(4),
      askingPrice: roundedAsk.toFixed(2),
      displayedZone,
      isPartial,
      isNationwide: nationwide,
      sellerSupportMonths: support,
      publishedAt,
      offerWindowClosesAt,
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
  legalName: "Catalogue demonstration Le Bon Portefeuille",
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
