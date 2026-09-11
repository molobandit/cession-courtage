import Link from "next/link";
import { CertifiedBadge } from "@/components/listing/certified-badge";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import type { PublicListingCard } from "@/lib/listing/public-card";

function windowLabel(daysLeft: number | null): string | null {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return "Fenêtre close";
  if (daysLeft === 0) return "Clôture aujourd’hui";
  if (daysLeft === 1) return "Clôture demain";
  return `Clôture dans ${daysLeft} jours`;
}

export function ListingAdRow({ item }: { item: PublicListingCard }) {
  const closing = windowLabel(item.daysLeft);
  const zone = item.isNationwide ? "Couverture nationale" : item.zone;

  return (
    <li>
      <Link
        href={`/annonces/${item.publicNumber}`}
        className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-paper px-5 py-5 transition-colors hover:bg-surface-alt"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="tabular font-medium text-ink">Dossier n° {item.publicNumber}</p>
            {item.certified ? <CertifiedBadge compact /> : null}
            {item.isPartial ? (
              <span className="rounded-full border border-line px-2.5 py-0.5 text-sm text-muted">
                Cession partielle
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[15px] text-muted">{zone}</p>
          <p className="mt-2 text-[15px] text-muted">
            {formatEuroWhole(item.annualCommissions)} de commissions / an
            {" · "}
            {formatCount(item.contractCount)} contrats
            {item.carriers[0] ? ` · ${item.carriers[0]}` : ""}
            {item.riskTypes[0] ? ` · ${item.riskTypes[0]}` : ""}
          </p>
          {closing ? <p className="mt-2 text-sm text-muted">{closing}</p> : null}
        </div>
        <p className="tabular shrink-0 text-xl font-bold text-ink">
          {formatEuroWhole(item.askingPrice)}
        </p>
      </Link>
    </li>
  );
}
