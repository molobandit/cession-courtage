import { listPublicListingFacets, listPublicListings } from "@/lib/authz";
import { listCertificationStatuses } from "@/lib/listing/certification";
import { ensurePublicCatalog } from "@/lib/listing/ensure-catalog";
import { mapPublicListingCard } from "@/lib/listing/map-public-card";
import type { PublicListingCard } from "@/lib/listing/public-card";

export async function loadPublicListingCards(): Promise<PublicListingCard[]> {
  try {
    await ensurePublicCatalog();
    const listings = await listPublicListings();
    const [facets, certifications] = await Promise.all([
      listPublicListingFacets(listings.map((l) => l.portfolioId)),
      listCertificationStatuses(listings.map((l) => l.id)),
    ]);

    return listings.map((item) =>
      mapPublicListingCard(
        {
          ...item,
          certificationStatus: certifications.get(item.id) ?? "NONE",
        },
        facets.get(item.portfolioId) ?? { carriers: [], riskTypes: [], clientSegments: [] },
      ),
    );
  } catch (error) {
    console.error("loadPublicListingCards", error);
    return [];
  }
}
