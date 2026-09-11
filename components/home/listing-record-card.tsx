import Link from "next/link";
import { MarketStamp } from "@/components/listing/market-stamp";
import { UNCERTIFIED_LABEL } from "@/lib/copy/market";
import { formatEuroWhole } from "@/lib/format/number";
import { commissionPerceptionCopy } from "@/lib/listing/perception";
import type { PublicListingCard } from "@/lib/listing/public-card";

export function ListingRecordCard({ item }: { item: PublicListingCard }) {
  const perception = commissionPerceptionCopy(item);
  return (
    <article className="relative flex h-full min-h-[22rem] w-[18.5rem] shrink-0 flex-col overflow-hidden rounded-3xl border border-line bg-paper p-5 shadow-sm sm:w-[20rem]">
      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        {item.sold ? <MarketStamp kind="sold" size="sm" /> : null}
        {item.certified ? <MarketStamp kind="certified" size="sm" /> : null}
      </div>
      <div className="flex items-start justify-between gap-2 pr-16">
        {item.certified ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-red-800">
            Portefeuille certifié
          </span>
        ) : (
          <span className="text-[11px] text-muted">{UNCERTIFIED_LABEL}</span>
        )}
      </div>
      <p className="mt-2 tabular text-[12px] text-muted">Dossier n° {item.publicNumber}</p>
      <dl className="mt-5 space-y-3">
        <div>
          <dt className="text-[12px] text-muted">Prix demandé</dt>
          <dd className="tabular mt-0.5 text-[22px] font-bold tracking-tight text-ink">
            {formatEuroWhole(item.askingPrice)}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted">Commissions</dt>
          <dd className="tabular mt-0.5 text-[16px] font-semibold text-indigo">
            {formatEuroWhole(item.annualCommissions)}
          </dd>
          <p className="mt-1 text-[12px] text-muted">{perception.modeLine}</p>
        </div>
      </dl>
      <div className="mt-auto pt-6">
        <Link
          href={`/annonces/${item.publicNumber}`}
          className="flex h-11 w-full items-center justify-center rounded-full bg-indigo text-center text-[14px] font-semibold leading-none !text-white hover:bg-indigo-dark"
        >
          Prendre position
        </Link>
      </div>
    </article>
  );
}
