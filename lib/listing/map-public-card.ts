import { LISTING_STATUS_LABELS, RISK_TYPE_LABELS, SEGMENT_LABELS } from "@/lib/labels";
import type { PublicListingCard } from "@/lib/listing/public-card";

const DAY_MS = 24 * 60 * 60 * 1000;

type ListingForCard = {
  id: string;
  publicNumber: number;
  status: keyof typeof LISTING_STATUS_LABELS;
  displayedZone: string;
  askingPrice: { toString(): string } | number;
  isPartial: boolean;
  isNationwide: boolean;
  sellerSupportMonths: number;
  offerWindowClosesAt: Date | null;
  certificationStatus: string;
  portfolio: {
    annualCommissions: { toString(): string } | number;
    contractCount: number;
    averageAgeMonths: number;
  };
};

type Facets = {
  carriers: string[];
  riskTypes: string[];
  clientSegments: string[];
};

export function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}

export function mapPublicListingCard(item: ListingForCard, facet: Facets): PublicListingCard {
  return {
    id: item.id,
    publicNumber: item.publicNumber,
    status: item.status,
    statusLabel: LISTING_STATUS_LABELS[item.status],
    zone: item.displayedZone,
    askingPrice: Number(item.askingPrice),
    annualCommissions: Number(item.portfolio.annualCommissions),
    contractCount: item.portfolio.contractCount,
    averageAgeMonths: item.portfolio.averageAgeMonths,
    isPartial: item.isPartial,
    isNationwide: item.isNationwide,
    sellerSupportMonths: item.sellerSupportMonths,
    daysLeft: daysUntil(item.offerWindowClosesAt),
    carriers: facet.carriers,
    riskTypes: facet.riskTypes.map((r) => RISK_TYPE_LABELS[r as keyof typeof RISK_TYPE_LABELS] ?? r),
    clientSegments: facet.clientSegments.map(
      (s) => SEGMENT_LABELS[s as keyof typeof SEGMENT_LABELS] ?? s,
    ),
    certified: item.certificationStatus === "CERTIFIED",
  };
}
