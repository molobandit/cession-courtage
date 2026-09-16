import Link from "next/link";
import { MarketBadge } from "@/components/listing/market-badge";
import { MarketStamp } from "@/components/listing/market-stamp";
import { UNCERTIFIED_LABEL } from "@/lib/copy/market";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import { commissionPerceptionCopy, perceptionLabel } from "@/lib/listing/perception";
import type { PublicListingCard } from "@/lib/listing/public-card";

export function ListingAdCard({ item }: { item: PublicListingCard }) {
  const perception = commissionPerceptionCopy(item);
  const title = item.riskTypes[0] ?? "Portefeuille d’assurance";

  return (
    <li>
      <Link
        href={`/annonces/${item.publicNumber}`}
        className="lift relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper p-6"
      >
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
          {item.sold ? <MarketStamp kind="sold" /> : null}
          {item.certified ? <MarketStamp kind="certified" /> : null}
        </div>

        <h3 className={`text-[17px] font-semibold leading-snug text-ink ${item.certified || item.sold ? "pr-24" : ""}`}>
          {title}
        </h3>
        <MarketBadge
          className="mt-2"
          label={item.statusLabel}
          tone={item.marketTone}
          detail={item.marketTone === "sealed" ? item.marketDetail : null}
        />
        {item.certified ? null : (
          <p className="mt-2 text-[12px] text-muted">{UNCERTIFIED_LABEL}</p>
        )}

        <div className="mt-5 grid grid-cols-2 border-t border-line pt-4">
          <div className="pr-4">
            <p className="tabular text-[18px] font-bold text-ink">
              {formatEuroWhole(item.annualCommissions)}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">Commissions / an</p>
            <p className="mt-1 text-[13px] font-semibold text-ink">
              {perception.mode === "UNSTATED" ? "Linéaire ou précompte non précisé" : perceptionLabel(perception.mode)}
            </p>
          </div>
          <div className="border-l border-line pl-4">
            <p className="tabular text-[18px] font-bold text-ink">
              {formatEuroWhole(item.askingPrice)}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">Prix</p>
          </div>
        </div>
        {!item.sold && item.offerCount ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-indigo-soft px-3 py-2 text-[13px] text-ink">
            {item.offerCount >= 2 || (item.bestOffer ?? 0) >= item.askingPrice ? (
              <span className="rounded-full bg-indigo px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Opportunité chaude</span>
            ) : null}
            <span>
              Meilleure offre <span className="tabular font-bold">{formatEuroWhole(item.bestOffer ?? 0)}</span>
            </span>
            <span className="text-muted">· {item.offerCount} offre{item.offerCount > 1 ? "s" : ""}</span>
          </p>
        ) : null}
        {perception.amountLine ? (
          <p className="mt-0.5 text-[13px] text-muted">{perception.amountLine}</p>
        ) : null}

        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          {formatCount(item.contractCount)} contrats
          {" · "}
          {item.isPartial ? "Cession partielle" : "Cession totale"}
          . Référence : dossier n° {item.publicNumber}.
        </p>
        <span className="mt-auto pt-5">
          <span className="inline-flex h-10 w-full items-center justify-center rounded-full bg-indigo text-[14px] font-semibold !text-white">
            {item.sold ? "Voir le dossier" : "Prendre position"}
          </span>
        </span>
      </Link>
    </li>
  );
}
