import { cn } from "@/lib/utils";
import type { MarketTone } from "@/lib/listing/market-status";

const TONE: Record<MarketTone, { pill: string; dot: string }> = {
  open: { pill: "border-ok/30 bg-ok/10 text-ok", dot: "bg-ok" },
  sealed: { pill: "border-indigo-line bg-indigo-soft text-indigo-dark", dot: "bg-indigo" },
  negotiation: { pill: "border-warn/30 bg-warn/10 text-warn", dot: "bg-warn" },
  sold: { pill: "border-line bg-surface-alt text-ink", dot: "bg-ink/50" },
  off: { pill: "border-line bg-surface-alt text-muted", dot: "bg-muted" },
};

/**
 * Pastille de cotation : l'état du portefeuille, lisible comme un cours.
 *
 * Le point s'anime tant que le titre se négocie en séance — ouvert ou scellé —
 * et s'éteint une fois le portefeuille en négociation, vendu ou retiré.
 */
export function MarketBadge({
  label,
  tone,
  detail,
  className,
}: {
  label: string;
  tone: MarketTone;
  detail?: string | null;
  className?: string;
}) {
  const t = TONE[tone];
  const enSeance = tone === "open" || tone === "sealed";
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold", t.pill)}>
        <span className="relative flex h-2 w-2">
          {enSeance ? (
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden", t.dot)} />
          ) : null}
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", t.dot)} />
        </span>
        {label}
      </span>
      {detail ? <span className="text-[12px] text-muted">{detail}</span> : null}
    </span>
  );
}
