import Link from "next/link";
import { formatEuroWhole } from "@/lib/format/number";
import { MarketStamp } from "@/components/listing/market-stamp";
import type { PublicListingCard } from "@/lib/listing/public-card";

/** Flux en direct, à droite du hero — sans recherche ni localisation. */
export function HomeHeroVisual({ listings }: { listings: PublicListingCard[] }) {
  const rows = listings.slice(0, 3);

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute -right-3 -top-3 z-10 hidden rounded-full border border-line bg-paper px-3 py-1 text-[12px] font-semibold text-ok sm:inline-flex">
        En direct
      </div>
      <div className="rounded-[1.75rem] border border-line bg-paper p-5 shadow-[0_24px_60px_-28px_rgba(17,24,39,0.28)] sm:p-6">
        <p className="text-[13px] font-semibold text-ink">Portefeuilles à la une</p>
        <p className="mt-1 text-[13px] text-muted">Salle de marché · prise de position</p>
        <ul className="mt-4 space-y-3">
          {rows.length > 0 ? (
            rows.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/annonces/${item.publicNumber}`}
                  className="relative flex items-center justify-between gap-3 rounded-2xl border border-line bg-page px-4 py-3.5 hover:border-indigo-line"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">
                      Dossier n° {item.publicNumber}
                      {item.riskTypes[0] ? ` · ${item.riskTypes[0]}` : ""}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      {item.certified ? "Certifié" : "À certifier"}
                      {item.sold ? " · Vendu" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.sold ? <MarketStamp kind="sold" size="sm" /> : null}
                    {item.certified && !item.sold ? <MarketStamp kind="certified" size="sm" /> : null}
                    <p className="tabular text-[15px] font-semibold text-indigo">
                      {formatEuroWhole(item.askingPrice)}
                    </p>
                  </div>
                </Link>
              </li>
            ))
          ) : (
            <li className="rounded-2xl border border-line bg-page px-4 py-3 text-[14px] text-muted">
              Les portefeuilles publiés apparaîtront ici.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
