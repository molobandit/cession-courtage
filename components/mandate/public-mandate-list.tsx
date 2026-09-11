"use client";

import { useMemo, useState } from "react";
import { ChipGroup } from "@/components/listing/chips";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import {
  EMPTY_MANDATE_FILTERS,
  countActiveMandateFilters,
  filterMandates,
  type MandateFilters,
  type PublicMandateCard,
} from "@/lib/mandate/public";

const SELECT_CLASS =
  "mt-2 h-11 w-full rounded-full border border-line bg-surface-alt px-4 text-[15px] text-ink";

/**
 * Demandes d'acquisition publiées.
 *
 * Pour un cédant qui hésite, la preuve qu'il existe des acheteurs pour son
 * profil vaut davantage qu'un argumentaire.
 */
export function PublicMandateList({ mandates }: { mandates: PublicMandateCard[] }) {
  const [filters, setFilters] = useState<MandateFilters>(EMPTY_MANDATE_FILTERS);
  const patch = (change: Partial<MandateFilters>) =>
    setFilters((current) => ({ ...current, ...change }));

  const options = useMemo(() => {
    const risks = new Set<string>();
    const segments = new Set<string>();
    for (const m of mandates) {
      m.riskTypes.forEach((r) => risks.add(r));
      m.clientSegments.forEach((s) => segments.add(s));
    }
    return {
      risks: [...risks].sort((a, b) => a.localeCompare(b, "fr")),
      segments: [...segments].sort((a, b) => a.localeCompare(b, "fr")),
    };
  }, [mandates]);

  const visible = useMemo(() => filterMandates(mandates, filters), [mandates, filters]);
  const active = countActiveMandateFilters(filters);

  if (mandates.length === 0) {
    return (
      <p className="mt-6 rounded-3xl border border-line bg-paper p-8 text-[15px] leading-relaxed text-muted">
        Aucune demande d’acquisition publiée pour le moment. Un acquéreur peut
        rendre son mandat visible depuis son espace membre, ce qui permet aux
        cédants de le contacter sans attendre.
      </p>
    );
  }

  return (
    <>
      <div className="mt-6 rounded-3xl border border-line bg-paper p-6">
        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <label htmlFor="m-risk" className="block text-[15px] font-medium text-ink">
              Branche recherchée
            </label>
            <select
              id="m-risk"
              value={filters.risk}
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
            <label htmlFor="m-segment" className="block text-[15px] font-medium text-ink">
              Clientèle
            </label>
            <select
              id="m-segment"
              value={filters.segment}
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
            <label htmlFor="m-zone" className="block text-[15px] font-medium text-ink">
              Votre zone
            </label>
            <input
              id="m-zone"
              value={filters.zone}
              onChange={(e) => patch({ zone: e.target.value })}
              placeholder="Rhône, Nord"
              className="mt-2 h-11 w-full rounded-full border border-line bg-surface-alt px-4 text-[15px] text-ink"
            />
          </div>
          <div>
            <label htmlFor="m-budget" className="block text-[15px] font-medium text-ink">
              Budget minimum
            </label>
            <input
              id="m-budget"
              inputMode="numeric"
              value={filters.minBudget}
              onChange={(e) => patch({ minBudget: e.target.value })}
              placeholder="50 000"
              className="tabular mt-2 h-11 w-full rounded-full border border-line bg-surface-alt px-4 text-right text-[15px] text-ink"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
          <p className="text-[15px] text-muted" aria-live="polite">
            {visible.length === 0
              ? "Aucune demande ne correspond."
              : `${formatCount(visible.length)} sur ${formatCount(mandates.length)}`}
          </p>
          {active > 0 ? (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_MANDATE_FILTERS)}
              className="text-[15px] font-medium text-indigo-dark underline-offset-4 hover:underline"
            >
              Tout effacer
            </button>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-line bg-paper p-8 text-[15px] leading-relaxed text-muted">
          Élargissez la branche ou le budget. Vous pouvez aussi publier votre
          portefeuille : les acquéreurs dont le mandat correspond seront prévenus.
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 lg:grid-cols-2">
          {visible.map((m) => (
            <li key={m.id}>
              <article className="h-full rounded-3xl border border-line bg-paper p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="tabular font-serif text-xl font-semibold text-ink">
                      Demande n° {m.publicNumber}
                    </p>
                    <p className="mt-1 text-[15px] text-muted">
                      Acquéreur {m.buyerAlias}
                      {m.isNationwide ? " · couverture nationale" : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-indigo-line bg-indigo-soft px-3 py-1 text-sm text-indigo-dark">
                    Recherche à acquérir
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4">
                  <div>
                    <dt className="text-sm text-muted">Budget maximum</dt>
                    <dd className="tabular mt-0.5 text-[15px] font-medium text-ink">
                      {formatEuroWhole(m.maxBudget)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted">Commissions recherchées</dt>
                    <dd className="tabular mt-0.5 text-[15px] font-medium text-ink">
                      {formatEuroWhole(m.minCommissions)} à {formatEuroWhole(m.maxCommissions)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 space-y-3 border-t border-line pt-4">
                  <ChipGroup label="Branches recherchées" items={m.riskTypes} />
                  <ChipGroup label="Clientèles" items={m.clientSegments} limit={3} />
                  {m.isNationwide ? null : <ChipGroup label="Zones" items={m.zones} limit={4} />}
                </div>

                <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
                  Financement : {m.financingLabel}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
