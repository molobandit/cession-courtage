import Link from "next/link";
import { Pills } from "@/components/home/pills";
import { formatEuroWhole } from "@/lib/format/number";
import type { PublicMandateCard } from "@/lib/mandate/public";
import { acquisitionLoginHref } from "@/lib/nav/acquisition";

export function MandateRecordCard({ item }: { item: PublicMandateCard }) {
  return (
    <article className="flex h-full min-h-[22rem] w-[18.5rem] shrink-0 flex-col rounded-3xl border border-indigo-line bg-indigo-soft/40 p-5 shadow-sm sm:w-[20rem]">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-dark">
          Recherche à acquérir
        </span>
        <p className="tabular text-[12px] text-muted">Demande n° {item.publicNumber}</p>
      </div>
      <dl className="mt-5 space-y-3">
        <div>
          <dt className="text-[12px] text-muted">Budget maximum</dt>
          <dd className="tabular mt-0.5 text-[22px] font-bold tracking-tight text-ink">
            {formatEuroWhole(item.maxBudget)}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted">Commissions recherchées</dt>
          <dd className="tabular mt-0.5 text-[15px] font-semibold text-indigo">
            {formatEuroWhole(item.minCommissions)} – {formatEuroWhole(item.maxCommissions)}
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <p className="text-[12px] text-muted">Branches</p>
        <Pills items={item.riskTypes} />
      </div>
      <p className="mt-4 text-[13px] text-muted">
        {item.isNationwide ? "France entière" : item.zones.slice(0, 2).join(", ")}
      </p>
      <div className="mt-auto pt-6">
        <Link
          href={acquisitionLoginHref()}
          className="flex h-11 w-full items-center justify-center rounded-full bg-indigo text-center text-[14px] font-semibold leading-none !text-white hover:bg-indigo-dark"
        >
          Déposer ma demande
        </Link>
      </div>
    </article>
  );
}
