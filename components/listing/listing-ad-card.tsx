import Link from "next/link";
import { MarketBadge } from "@/components/listing/market-badge";
import { MarketStamp } from "@/components/listing/market-stamp";
import { UNCERTIFIED_LABEL } from "@/lib/copy/market";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import { listingMultiple } from "@/lib/market/indices";
import type { PublicListingCard } from "@/lib/listing/public-card";

/**
 * Une carte de la salle de marché.
 *
 * Elle reprend les repères de « L'essentiel du dossier » : commissions,
 * contrats, ancienneté, montant, multiple. Pas de meilleure offre ni de
 * compte à rebours : le montant est arrêté après l'étude, et on se positionne
 * en versant son dépôt.
 */
export function ListingAdCard({ item }: { item: PublicListingCard }) {
  const branches = item.riskTypes.slice(0, 2).join(", ") || "Portefeuille d’assurance";
  const multiple = listingMultiple(item.askingPrice, item.annualCommissions);

  return (
    <li>
      <Link
        href={`/annonces/${item.publicNumber}`}
        className="lift relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper p-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          {item.certified ? <MarketStamp kind="certified" /> : null}
          <MarketBadge label={item.statusLabel} tone={item.marketTone} detail={null} />
        </div>

        <h3 className="mt-3 text-[17px] font-semibold leading-snug text-ink">
          Dossier n° {item.publicNumber}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {branches} · {item.zone}
        </p>
        {item.certified ? null : <p className="mt-1 text-[12px] text-muted">{UNCERTIFIED_LABEL}</p>}

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
          <Repere label="Commissions / an" value={formatEuroWhole(item.annualCommissions)} />
          <Repere label="Contrats" value={formatCount(item.contractCount)} />
          <Repere
            label="Ancienneté"
            value={item.averageAgeMonths > 0 ? `${Math.round(item.averageAgeMonths)} mois` : "n.c."}
          />
        </dl>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
          <Repere label="Montant" value={formatEuroWhole(item.askingPrice)} fort />
          <Repere label="Multiple" value={multiple ? multiple.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "n.c."} fort />
        </dl>

        <span className="mt-auto pt-5">
          <span className="inline-flex h-10 w-full items-center justify-center rounded-full bg-indigo text-[14px] font-semibold !text-white">
            Voir le dossier
          </span>
        </span>
      </Link>
    </li>
  );
}

function Repere({ label, value, fort = false }: { label: string; value: string; fort?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className={`tabular mt-1 truncate font-bold text-ink ${fort ? "text-[18px]" : "text-[15px]"}`}>
        {value}
      </dd>
    </div>
  );
}
