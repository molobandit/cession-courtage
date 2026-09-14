import { listingQuotes } from "@/lib/offer/quote";
import { listPublicListingFacets, listPublicListings } from "@/lib/authz";
import { listCertificationStatuses } from "@/lib/listing/certification";
import { ensurePublicCatalog } from "@/lib/listing/ensure-catalog";
import { listingLotTotals } from "@/lib/listing/lot-totals";
import { mapPublicListingCard } from "@/lib/listing/map-public-card";
import type { PublicListingCard } from "@/lib/listing/public-card";

export async function loadPublicListingCards(): Promise<PublicListingCard[]> {
  try {
    await ensurePublicCatalog();
    const listings = await listPublicListings();
    const [facets, certifications, cotes, lots] = await Promise.all([
      listPublicListingFacets(listings.map((l) => l.portfolioId)),
      listCertificationStatuses(listings.map((l) => l.id)),
      listingQuotes(listings.map((l) => l.id)),
      listingLotTotals(listings.filter((l) => l.isPartial).map((l) => l.id)),
    ]);

    return listings.map((item) => {
      const lot = item.isPartial ? lots.get(item.id) : undefined;
      return {
        ...mapPublicListingCard(
          {
            ...item,
            portfolio: lot
              ? {
                  ...item.portfolio,
                  annualCommissions: lot.annualCommissions,
                  contractCount: lot.contractCount,
                }
              : item.portfolio,
            certificationStatus: certifications.get(item.id) ?? "NONE",
          },
          facets.get(item.portfolioId) ?? {
            carriers: [],
            riskTypes: [],
            clientSegments: [],
          },
        ),
        bestOffer: cotes.get(item.id)?.bestOffer ?? null,
        offerCount: cotes.get(item.id)?.offerCount ?? 0,
      };
    });
  } catch (error) {
    console.error("loadPublicListingCards", error);
    return [];
  }
}
