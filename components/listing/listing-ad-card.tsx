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

function PinIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-muted" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2 4.5 8.5 4.5 8.5s4.5-5.3 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 6.1a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ListingAdCard({ item }: { item: PublicListingCard }) {
  const closing = windowLabel(item.daysLeft);
  const zone = item.isNationwide ? "France entière" : item.zone;
  const title = item.riskTypes[0] ?? "Portefeuille de courtage";

  return (
    <li>
      <Link
        href={`/annonces/${item.publicNumber}`}
        className="lift relative flex h-full flex-col rounded-2xl border border-line bg-paper p-6"
      >
        {item.certified ? (
          <span className="absolute right-4 top-4">
            <CertifiedBadge compact />
          </span>
        ) : null}

        <h3 className={`text-[17px] font-semibold leading-snug text-ink ${item.certified ? "pr-24" : ""}`}>
          {title}
        </h3>
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
          <PinIcon />
          {zone}
        </p>

        <div className="mt-5 grid grid-cols-2 border-t border-line pt-4">
          <div className="pr-4">
            <p className="tabular text-[18px] font-bold text-ink">
              {formatEuroWhole(item.annualCommissions)}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">Commissions</p>
          </div>
          <div className="border-l border-line pl-4">
            <p className="tabular text-[18px] font-bold text-ink">
              {formatEuroWhole(item.askingPrice)}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">Prix demandé</p>
          </div>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          {formatCount(item.contractCount)} contrats
          {item.carriers[0] ? ` · ${item.carriers[0]}` : ""}
          {" · "}
          {item.isPartial ? "Cession partielle" : "Cession totale"}
          {closing ? ` · ${closing}` : ""}
          . Référence : dossier n° {item.publicNumber}.
        </p>
        <span className="mt-auto pt-5">
          <span className="inline-flex h-10 w-full items-center justify-center rounded-full bg-indigo text-[14px] font-semibold !text-white">
            Voir l’annonce
          </span>
        </span>
      </Link>
    </li>
  );
}
