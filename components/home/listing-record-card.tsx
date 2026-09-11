import Link from "next/link";
import { Pills } from "@/components/home/pills";
import { formatEuroWhole } from "@/lib/format/number";
import type { PublicListingCard } from "@/lib/listing/public-card";

export function ListingRecordCard({ item }: { item: PublicListingCard }) {
  const zone = item.isNationwide ? "France entière" : item.zone;
  return (
    <article className="flex h-full min-h-[22rem] w-[18.5rem] shrink-0 flex-col rounded-3xl border border-line bg-paper p-5 shadow-sm sm:w-[20rem]">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-indigo-soft px-2.5 py-1 text-[11px] font-semibold text-indigo-dark">
          {item.certified ? "Portefeuille certifié" : "Cession"}
        </span>
        <p className="tabular text-[12px] text-muted">Dossier n° {item.publicNumber}</p>
      </div>
      <dl className="mt-5 space-y-3">
        <div>
          <dt className="text-[12px] text-muted">Prix demandé</dt>
          <dd className="tabular mt-0.5 text-[22px] font-bold tracking-tight text-ink">
            {formatEuroWhole(item.askingPrice)}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted">Commissions / an</dt>
          <dd className="tabular mt-0.5 text-[16px] font-semibold text-indigo">
            {formatEuroWhole(item.annualCommissions)}
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <p className="text-[12px] text-muted">Branches</p>
        <Pills items={item.riskTypes} />
      </div>
      <div className="mt-3">
        <p className="text-[12px] text-muted">Compagnies</p>
        <Pills items={item.carriers} limit={2} />
      </div>
      <p className="mt-4 text-[13px] text-muted">{zone}</p>
      <div className="mt-auto pt-6">
        <Link
          href={`/annonces/${item.publicNumber}`}
          className="flex h-11 w-full items-center justify-center rounded-full bg-indigo text-center text-[14px] font-semibold leading-none !text-white hover:bg-indigo-dark"
        >
          Voir les détails
        </Link>
      </div>
    </article>
  );
}
