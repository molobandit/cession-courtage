import "server-only";
import { UserRole } from "@prisma/client";
import { loadListingBriefFields } from "@/lib/listing/brief-fields";
import { cessionMotiveLabel, regulatoryFacts } from "@/lib/listing/brief-labels";
import { companyDocLabel } from "@/lib/listing/company-doc-kinds";
import { listCertificationStatuses } from "@/lib/listing/certification";
import { DISTRIBUTION_LABELS, RISK_TYPE_LABELS, SEGMENT_LABELS } from "@/lib/labels";
import { breakdownBy, type AnalyticsLine, type Share } from "@/lib/portfolio/analytics";
import { profileFacts, readFirmProfile } from "@/lib/firm/profile";
import { prisma } from "@/lib/prisma";

/**
 * Tout ce que dit la présentation détaillée d'un cabinet cédant.
 *
 * Rien n'est ressaisi : l'identité vient de la fiche société et du compte,
 * les chiffres du portefeuille importé, la cession de l'annonce. Une case vide
 * reste vide plutôt que d'être inventée.
 */
export type CompanyPresentation = {
  publicNumber: number;
  issuedAt: Date;
  firm: {
    legalName: string;
    legalForm: string;
    siren: string;
    address: string;
    postalCode: string;
    city: string;
    region: string;
    foundedYear: number | null;
    headcount: number | null;
    annualRevenue: number | null;
    distribution: string;
    website: string | null;
    activityType: string | null;
  };
  contact: { fullName: string | null; jobTitle: string | null; email: string; phone: string | null; oriasNumber: string | null } | null;
  portfolio: {
    label: string;
    annualCommissions: number;
    contractCount: number;
    clientCount: number;
    averageAgeMonths: number;
    churnRate: number;
    history: { label: string; value: number }[];
  };
  sale: {
    askingPrice: number;
    multiple: number | null;
    negotiable: boolean;
    motive: string | null;
    desiredDate: string | null;
    presentation: string | null;
    zone: string;
    certified: boolean;
    partial: boolean;
  };
  breakdowns: { title: string; shares: Share[] }[];
  regulatory: { label: string; value: string }[];
  /** Profil du cabinet renseigné dans le compte, volet par volet. */
  profile: { section: string; rows: { label: string; value: string }[] }[];
  documents: { label: string; date: Date }[];
};

export async function loadCompanyPresentation(listingId: string): Promise<CompanyPresentation | null> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      publicNumber: true,
      askingPrice: true,
      displayedZone: true,
      isPartial: true,
      isNationwide: true,
      negotiable: true,
      lines: { select: { contractLineId: true } },
      companyDocuments: { select: { kind: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      portfolio: {
        select: {
          label: true,
          firmId: true,
          annualCommissions: true,
          contractCount: true,
          clientCount: true,
          averageAgeMonths: true,
          churnRate12m: true,
          commissionsYear1: true,
          commissionsYear2: true,
          commissionsYear3: true,
          firm: true,
          contractLines: {
            select: { id: true, carrier: true, riskType: true, clientSegment: true, department: true, clientKey: true, annualCommission: true, renewalDate: true, effectiveDate: true },
          },
        },
      },
    },
  });
  if (!listing) return null;
  const { portfolio } = listing;
  const firm = portfolio.firm;

  const [contact, brief, certifications] = await Promise.all([
    prisma.user.findFirst({
      where: { firmId: portfolio.firmId, role: { in: [UserRole.SELLER, UserRole.BOTH] }, erasedAt: null },
      select: { fullName: true, jobTitle: true, email: true, phone: true, oriasNumber: true },
      orderBy: { createdAt: "asc" },
    }),
    loadListingBriefFields(listing.id),
    listCertificationStatuses([listing.id]),
  ]);

  let source = portfolio.contractLines;
  if (listing.isPartial && listing.lines.length > 0) {
    const retenues = new Set(listing.lines.map((l) => l.contractLineId));
    source = source.filter((l) => retenues.has(l.id));
  }
  const lines: AnalyticsLine[] = source.map((row) => ({
    carrier: row.carrier,
    riskType: row.riskType,
    clientSegment: row.clientSegment,
    department: row.department,
    clientKey: row.clientKey,
    annualCommission: Number(row.annualCommission),
    renewalDate: row.renewalDate,
    effectiveDate: row.effectiveDate,
  }));

  const annee = new Date().getFullYear();
  const historique = [
    { label: `Exercice ${annee - 3}`, value: portfolio.commissionsYear1 },
    { label: `Exercice ${annee - 2}`, value: portfolio.commissionsYear2 },
    { label: `Exercice ${annee - 1}`, value: portfolio.commissionsYear3 },
  ]
    .filter((h) => h.value !== null)
    .map((h) => ({ label: h.label, value: Number(h.value) }));

  const asking = Number(listing.askingPrice);
  const lot = listing.isPartial && listing.lines.length > 0;
  const commissions = lot
    ? Math.round(lines.reduce((s, l) => s + l.annualCommission, 0) * 100) / 100
    : Number(portfolio.annualCommissions);

  return {
    publicNumber: listing.publicNumber,
    issuedAt: new Date(),
    firm: {
      legalName: firm.legalName,
      legalForm: firm.legalForm,
      siren: firm.siren,
      address: firm.address,
      postalCode: firm.postalCode,
      city: firm.city,
      region: firm.region,
      foundedYear: firm.foundedAt ? firm.foundedAt.getFullYear() : null,
      headcount: firm.headcount,
      annualRevenue: firm.annualRevenue === null ? null : Number(firm.annualRevenue),
      distribution: DISTRIBUTION_LABELS[firm.distributionMode] ?? firm.distributionMode,
      website: firm.website,
      activityType: firm.activityType,
    },
    contact,
    portfolio: {
      label: portfolio.label,
      annualCommissions: commissions,
      contractCount: lot ? lines.length : portfolio.contractCount,
      clientCount: lot ? new Set(lines.map((l) => l.clientKey)).size : portfolio.clientCount,
      averageAgeMonths: portfolio.averageAgeMonths,
      churnRate: Number(portfolio.churnRate12m),
      history: historique,
    },
    sale: {
      askingPrice: asking,
      multiple: commissions > 0 ? asking / commissions : null,
      negotiable: listing.negotiable,
      motive: cessionMotiveLabel(brief.cessionMotive),
      desiredDate: brief.desiredCessionDate,
      presentation: brief.presentation,
      zone: listing.isNationwide ? "France entière" : listing.displayedZone,
      certified: certifications.get(listing.id) === "CERTIFIED",
      partial: listing.isPartial,
    },
    breakdowns: [
      { title: "Par branche", shares: breakdownBy(lines, (l) => RISK_TYPE_LABELS[l.riskType as keyof typeof RISK_TYPE_LABELS] ?? l.riskType, 6) },
      { title: "Par clientèle", shares: breakdownBy(lines, (l) => SEGMENT_LABELS[l.clientSegment as keyof typeof SEGMENT_LABELS] ?? l.clientSegment, 4) },
      { title: "Par compagnie", shares: breakdownBy(lines, (l) => l.carrier, 6) },
      { title: "Par zone", shares: breakdownBy(lines, (l) => (listing.isNationwide ? "France entière" : `Département ${l.department}`), 5) },
    ],
    regulatory: regulatoryFacts(brief.regulatory),
    profile: profileFacts(readFirmProfile(firm.profileJson)),
    documents: listing.companyDocuments.map((d) => ({ label: companyDocLabel(d.kind), date: d.createdAt })),
  };
}
