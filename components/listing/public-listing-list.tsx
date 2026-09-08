"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCount, formatEuroWhole } from "@/lib/format/number";

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
  /** Jours restants avant la clôture, calculé côté serveur. null si aucune fenêtre. */
  daysLeft: number | null;
};

type SortKey = "recent" | "price-asc" | "price-desc" | "commissions-desc";

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

export function PublicListingList({ listings }: { listings: PublicListingCard[] }) {
  const [zone, setZone] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");

  const visible = useMemo(() => {
    const zoneQuery = zone.trim().toLowerCase();
    const ceiling = maxPrice.trim() === "" ? null : Number(maxPrice.replace(/[^\d]/g, ""));

    const filtered = listings.filter((item) => {
      if (zoneQuery && !item.zone.toLowerCase().includes(zoneQuery)) return false;
      if (ceiling !== null && Number.isFinite(ceiling) && item.askingPrice > ceiling) return false;
      if (openOnly && !(item.status === "OFFERS_OPEN" && (item.daysLeft ?? -1) >= 0)) return false;
      return true;
    });

    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => a.askingPrice - b.askingPrice);
    if (sort === "price-desc") sorted.sort((a, b) => b.askingPrice - a.askingPrice);
    if (sort === "commissions-desc")
      sorted.sort((a, b) => b.annualCommissions - a.annualCommissions);
    return sorted;
  }, [listings, zone, maxPrice, openOnly, sort]);

  return (
    <>
      <div className="mt-6 rounded-3xl border border-line bg-paper p-5">
        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <label htmlFor="zone" className="block text-[15px] font-medium text-ink">
              Zone
            </label>
            <input
              id="zone"
              value={zone}
              onChange={(event) => setZone(event.target.value)}
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
              onChange={(event) => setMaxPrice(event.target.value)}
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
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="mt-2 h-11 w-full rounded-full border border-line bg-cream px-4 text-[15px] text-ink"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(event) => setOpenOnly(event.target.checked)}
                className="h-5 w-5 rounded border-line"
              />
              Fenêtre encore ouverte
            </label>
          </div>
        </div>
        <p className="mt-4 text-[15px] text-muted" aria-live="polite">
          {visible.length === 0
            ? "Aucun dossier ne correspond à ces critères."
            : `${formatCount(visible.length)} dossier${visible.length > 1 ? "s" : ""} sur ${formatCount(listings.length)}.`}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-line bg-paper p-8 text-[15px] text-muted">
          Élargissez la zone ou le budget. Vous pouvez aussi déposer un mandat
          d’achat pour être prévenu dès qu’un dossier correspondant est publié.
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
                  className="block rounded-3xl border border-line bg-paper p-6 transition-colors hover:border-gold-deep/50 hover:bg-cream"
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
                    <div className="flex flex-wrap gap-2">
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
