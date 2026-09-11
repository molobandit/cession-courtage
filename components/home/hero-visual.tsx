import Link from "next/link";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import type { PublicListingCard } from "@/lib/listing/public-card";

/** Fenêtres empilées, sans photo identifiable ni raison sociale. */
export function HomeHeroVisual({ listings }: { listings: PublicListingCard[] }) {
  const cards = listings.slice(0, 3);
  const featured = cards[0];
  const rows = cards.length > 0 ? cards : [];

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-[0_20px_50px_-24px_rgba(17,24,39,0.35)] sm:p-6">
        <p className="text-[13px] font-semibold text-ink">Portefeuilles à la une</p>
        <ul className="mt-4 space-y-3">
          {rows.length > 0 ? (
            rows.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/annonces/${item.publicNumber}?voie=investir`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-page px-4 py-3 hover:border-indigo-line"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">
                      {item.isNationwide ? "France entière" : item.zone}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {item.riskTypes[0] ?? "Portefeuille"}
                      {item.certified ? " · Certifié" : ""}
                    </p>
                  </div>
                  <p className="tabular shrink-0 text-[15px] font-semibold text-indigo">
                    {formatEuroWhole(item.askingPrice)}
                  </p>
                </Link>
              </li>
            ))
          ) : (
            <li className="rounded-2xl border border-line bg-page px-4 py-3 text-[14px] text-muted">
              Les annonces publiées apparaîtront ici, sous alias.
            </li>
          )}
        </ul>
      </div>

      {featured ? (
        <div className="mt-4 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:absolute sm:-bottom-8 sm:right-[-8%] sm:mt-0 sm:w-[70%] sm:p-5">
          <p className="text-[13px] font-semibold text-ink">Données du portefeuille</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <dt className="text-muted">Commissions / an</dt>
              <dd className="tabular mt-0.5 font-medium text-ink">
                {formatEuroWhole(featured.annualCommissions)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Contrats</dt>
              <dd className="tabular mt-0.5 font-medium text-ink">
                {formatCount(featured.contractCount)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            Alias Dossier n° {featured.publicNumber}. Ni raison sociale, ni commune.
          </p>
        </div>
      ) : null}
    </div>
  );
}
