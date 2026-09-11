"use client";

import { useMemo, useState } from "react";
import { ListingAdCard } from "@/components/listing/listing-ad-card";
import { formatCount } from "@/lib/format/number";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  filterListings,
  sortListings,
  type CatalogueFilters,
  type SortKey,
} from "@/lib/listing/filter";
import type { PublicListingCard } from "@/lib/listing/public-card";

export type { PublicListingCard };

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Les plus récentes",
  "price-asc": "Prix croissant",
  "price-desc": "Prix décroissant",
  "commissions-desc": "Commissions décroissantes",
};

const SELECT_CLASS =
  "mt-2 h-11 w-full rounded-md border border-line bg-surface-alt px-4 text-[15px] text-ink";

export function PublicListingList({
  listings,
  initialFilters,
}: {
  listings: PublicListingCard[];
  initialFilters?: Partial<CatalogueFilters>;
}) {
  const [filters, setFilters] = useState<CatalogueFilters>({
    ...EMPTY_FILTERS,
    ...initialFilters,
  });
  const [sort, setSort] = useState<SortKey>("recent");

  const { zone, carrier, risk, segment, maxPrice, q, openOnly, certifiedOnly } = filters;
  const patch = (change: Partial<CatalogueFilters>) =>
    setFilters((current) => ({ ...current, ...change }));

  const options = useMemo(() => {
    const carriers = new Set<string>();
    const risks = new Set<string>();
    const segments = new Set<string>();
    for (const item of listings) {
      item.carriers.forEach((c) => carriers.add(c));
      item.riskTypes.forEach((r) => risks.add(r));
      item.clientSegments.forEach((s) => segments.add(s));
    }
    return {
      carriers: [...carriers].sort((a, b) => a.localeCompare(b, "fr")),
      risks: [...risks].sort((a, b) => a.localeCompare(b, "fr")),
      segments: [...segments].sort((a, b) => a.localeCompare(b, "fr")),
    };
  }, [listings]);

  const visible = useMemo(
    () => sortListings(filterListings(listings, filters), sort),
    [listings, filters, sort],
  );

  const activeFilters = countActiveFilters(filters);

  function reset() {
    setFilters(EMPTY_FILTERS);
  }

  return (
    <>
      <div className="mt-6 rounded-2xl border border-line bg-paper p-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <label htmlFor="q" className="block text-[15px] font-medium text-ink">
              Recherche
            </label>
            <input
              id="q"
              value={q}
              onChange={(e) => patch({ q: e.target.value })}
              placeholder="Zone, compagnie, branche ou numéro"
              className="mt-2 h-11 w-full rounded-md border border-line bg-surface-alt px-4 text-[15px] text-ink"
            />
          </div>
          <div>
            <label htmlFor="carrier" className="block text-[15px] font-medium text-ink">
              Compagnie
            </label>
            <select
              id="carrier"
              value={carrier}
              onChange={(e) => patch({ carrier: e.target.value })}
              className={SELECT_CLASS}
            >
              <option value="">Toutes</option>
              {options.carriers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="risk" className="block text-[15px] font-medium text-ink">
              Branche
            </label>
            <select
              id="risk"
              value={risk}
              onChange={(e) => patch({ risk: e.target.value })}
              className={SELECT_CLASS}
            >
              <option value="">Toutes</option>
              {options.risks.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="segment" className="block text-[15px] font-medium text-ink">
              Clientèle
            </label>
            <select
              id="segment"
              value={segment}
              onChange={(e) => patch({ segment: e.target.value })}
              className={SELECT_CLASS}
            >
              <option value="">Toutes</option>
              {options.segments.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="zone" className="block text-[15px] font-medium text-ink">
              Zone
            </label>
            <input
              id="zone"
              value={zone}
              onChange={(e) => patch({ zone: e.target.value })}
              placeholder="Rhône, Nord, Île-de-France"
              className="mt-2 h-11 w-full rounded-md border border-line bg-surface-alt px-4 text-[15px] text-ink"
            />
          </div>
          <div>
            <label htmlFor="maxPrice" className="block text-[15px] font-medium text-ink">
              Budget maximum
            </label>
            <input
              id="maxPrice"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => patch({ maxPrice: e.target.value })}
              placeholder="50 000"
              className="tabular mt-2 h-11 w-full rounded-md border border-line bg-surface-alt px-4 text-right text-[15px] text-ink"
            />
          </div>
          <div>
            <label htmlFor="sort" className="block text-[15px] font-medium text-ink">
              Trier par
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={SELECT_CLASS}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2.5 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(e) => patch({ openOnly: e.target.checked })}
                className="h-5 w-5 rounded border-line"
              />
              Fenêtre d’offres encore ouverte
            </label>
            <label className="flex items-center gap-2.5 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={certifiedOnly}
                onChange={(e) => patch({ certifiedOnly: e.target.checked })}
                className="h-5 w-5 rounded border-line"
              />
              Portefeuilles certifiés
            </label>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-[15px] text-muted" aria-live="polite">
              {visible.length === 0
                ? "Aucun dossier ne correspond."
                : `${formatCount(visible.length)} sur ${formatCount(listings.length)}`}
            </p>
            {activeFilters > 0 ? (
              <button
                type="button"
                onClick={reset}
                className="text-[15px] font-medium text-indigo-dark underline-offset-4 hover:underline"
              >
                Tout effacer
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 rounded-xl border border-line bg-paper p-8 text-[15px] leading-relaxed text-muted">
          Élargissez la compagnie, la branche ou le budget. Vous pouvez aussi déposer
          un mandat d’achat pour être prévenu dès qu’un dossier correspondant est publié.
        </p>
      ) : (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <ListingAdCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}
