import Link from "next/link";
import { MarketStamp } from "@/components/listing/market-stamp";
import { UNCERTIFIED_LABEL } from "@/lib/copy/market";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import { commissionPerceptionCopy } from "@/lib/listing/perception";
import type { PublicListingCard } from "@/lib/listing/public-card";

export function ListingAdRow({ item }: { item: PublicListingCard }) {
  const perception = commissionPerceptionCopy(item);

  return (
    <li>
      <Link
        href={`/annonces/${item.publicNumber}`}
        className="relative flex flex-wrap items-start justify-between gap-4 border-b border-line bg-paper px-5 py-5 transition-colors hover:bg-surface-alt"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="tabular font-medium text-ink">Dossier n° {item.publicNumber}</p>
            {item.sold ? <MarketStamp kind="sold" size="sm" /> : null}
            {item.certified ? <MarketStamp kind="certified" size="sm" /> : null}
            {!item.certified ? (
              <span className="text-[12px] text-muted">{UNCERTIFIED_LABEL}</span>
            ) : null}
          </div>
          <p className="mt-2 text-[15px] text-muted">
            {formatEuroWhole(item.annualCommissions)} de commissions / an
            {" · "}
            {perceptionLabelShort(perception.modeLine)}
            {" · "}
            {formatCount(item.contractCount)} contrats
            {item.riskTypes[0] ? ` · ${item.riskTypes[0]}` : ""}
          </p>
        </div>
        <p className="tabular shrink-0 text-xl font-bold text-ink">
          {formatEuroWhole(item.askingPrice)}
        </p>
      </Link>
    </li>
  );
}

function perceptionLabelShort(modeLine: string) {
  return modeLine.replace("Mode de perception : ", "Perception ");
}
