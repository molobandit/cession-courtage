"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChipGroup } from "@/components/listing/chips";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  filterListings,
  sortListings,
  type CatalogueFilters,
  type SortKey,
} from "@/lib/listing/filter";

export type PublicListingCard = {
  id: string;
  publicNumber: number;
  status: string;
  statusLabel: string;
  zone: string;
  askingPrice: number;
  annualCommissions: number;
  contractCount: number;
  averageAgeMonths: number;
  isPartial: boolean;
  isNationwide: boolean;
  sellerSupportMonths: number;
  /** Jours restants avant la clôture, calculé côté serveur. */
  daysLeft: number | null;
  carriers: string[];
  riskTypes: string[];
  clientSegments: string[];
};

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Les plus récentes",
  "price-asc": "Prix croissant",
  "price-desc": "Prix décroissant",
  "commissions-desc": "Commissions décroissantes",
};

function windowLabel(daysLeft: number | null): string | null {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return "Fenêtre close";
  if (daysLeft === 0) return "Clôture aujourd’hui";
  if (daysLeft === 1) return "Clôture demain";
  return `Clôture dans ${daysLeft} jours`;
}

const SELECT_CLASS =
  "mt-2 h-11 w-full rounded-full border border-line bg-cream px-4 text-[15px] text-ink";

export function PublicListingList({ listings }: { listings: PublicListingCard[] }) {
  const [filters, setFilters] = useState<CatalogueFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("recent");

  const { zone, carrier, risk, segment, maxPrice, openOnly } = filters;
  const patch = (change: Partial<CatalogueFilters>) =>
    setFilters((current) => ({ ...current, ...change }));

  // Les listes de filtres viennent des annonces réelles : jamais d'option vide.
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

  // Filtrage et tri passent par des fonctions pures, couvertes par des tests.
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
      <div className="mt-6 rounded-3xl border border-line bg-paper p-6">
        <div className="grid gap-4 lg:grid-cols-3">
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
              className="mt-2 h-11 w-full rounded-full border border-line bg-cream px-4 text-[15px] text-ink"
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
              className="tabular mt-2 h-11 w-full rounded-full border border-line bg-cream px-4 text-right text-[15px] text-ink"
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
          <label className="flex items-center gap-2.5 text-[15px] text-ink">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => patch({ openOnly: e.target.checked })}
              className="h-5 w-5 rounded border-line"
            />
            Fenêtre d’offres encore ouverte
          </label>
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
                className="text-[15px] font-medium text-gold-deep underline-offset-4 hover:underline"
              >
                Tout effacer
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-line bg-paper p-8 text-[15px] leading-relaxed text-muted">
          Élargissez la compagnie, la branche ou le budget. Vous pouvez aussi déposer
          un mandat d’achat pour être prévenu dès qu’un dossier correspondant est publié.
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 lg:grid-cols-2">
          {visible.map((item) => {
            const closing = windowLabel(item.daysLeft);
            const urgent = item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= 3;
            return (
              <li key={item.id}>
                <Link
                  href={`/annonces/${item.publicNumber}`}
                  className="block h-full rounded-3xl border border-line bg-paper p-6 transition-colors hover:border-gold-deep/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="tabular font-serif text-xl font-semibold text-ink">
                        Portefeuille #{item.publicNumber}
                      </p>
                      <p className="mt-1 text-[15px] text-muted">
                        {item.isNationwide ? "Couverture nationale" : item.zone}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {item.isPartial ? (
                        <span className="rounded-full border border-line bg-cream px-3 py-1 text-sm text-ink">
                          Cession partielle
                        </span>
                      ) : null}
                      <span className="rounded-full border border-line bg-cream px-3 py-1 text-sm text-ink">
                        {item.statusLabel}
                      </span>
                    </div>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
                    <div>
                      <dt className="text-sm text-muted">Prix demandé</dt>
                      <dd className="tabular mt-0.5 text-[15px] font-medium text-ink">
                        {formatEuroWhole(item.askingPrice)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted">Commissions / an</dt>
                      <dd className="tabular mt-0.5 text-[15px] font-medium text-ink">
                        {formatEuroWhole(item.annualCommissions)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted">Contrats</dt>
                      <dd className="tabular mt-0.5 text-[15px] font-medium text-ink">
                        {formatCount(item.contractCount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted">Ancienneté</dt>
                      <dd className="tabular mt-0.5 text-[15px] font-medium text-ink">
                        {formatCount(item.averageAgeMonths)} mois
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 space-y-3 border-t border-line pt-4">
                    <ChipGroup label="Compagnies" items={item.carriers} />
                    <ChipGroup label="Branches" items={item.riskTypes} />
                    <ChipGroup label="Clientèles" items={item.clientSegments} limit={3} />
                  </div>

                  {closing || item.sellerSupportMonths > 0 ? (
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
                      {closing ? (
                        <span
                          className={
                            urgent
                              ? "rounded-full bg-gold px-3 py-1 text-sm font-medium text-charcoal"
                              : "text-sm text-muted"
                          }
                        >
                          {closing}
                        </span>
                      ) : null}
                      {item.sellerSupportMonths > 0 ? (
                        <span className="text-sm text-muted">
                          Accompagnement cédant de {item.sellerSupportMonths} mois
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
