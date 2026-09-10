import type { MarketPosition } from "@/lib/portfolio/analytics";

type Status = "bon" | "surveiller" | "penalisant";

const STATUS_STYLE: Record<Status, { dot: string; text: string; label: string }> = {
  bon: { dot: "bg-ok", text: "text-ok", label: "Favorable" },
  surveiller: { dot: "bg-indigo", text: "text-indigo-dark", label: "À surveiller" },
  penalisant: { dot: "bg-danger", text: "text-danger", label: "Pénalisant" },
};

/**
 * Jauge d'un ratio face à un seuil.
 *
 * L'état est toujours porté par un libellé écrit, jamais par la seule couleur :
 * un lecteur daltonien doit lire la même chose que les autres.
 */
export function ConcentrationMeter({
  title,
  value,
  status,
  detail,
  scaleLabels,
}: {
  title: string;
  /** Ratio entre 0 et 1. */
  value: number;
  status: Status;
  detail: string;
  scaleLabels: [string, string];
}) {
  const style = STATUS_STYLE[status];
  const percent = Math.min(100, Math.max(0, value * 100));

  return (
    <div className="rounded-3xl border border-line bg-paper p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
        <span className={`flex items-center gap-2 text-[15px] font-medium ${style.text}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} aria-hidden="true" />
          {style.label}
        </span>
      </div>

      <p className="tabular mt-4 font-serif text-4xl font-semibold text-ink">
        {(value * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
      </p>

      <div
        className="mt-4 h-2.5 w-full rounded-full bg-surface-alt"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={title}
      >
        <div className="h-full rounded-full bg-indigo" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>{scaleLabels[0]}</span>
        <span>{scaleLabels[1]}</span>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-muted">{detail}</p>
    </div>
  );
}

/** Situe le multiple effectif du portefeuille dans la fourchette du marché français. */
export function MarketPositionCard({ position }: { position: MarketPosition }) {
  const verdictLabel =
    position.verdict === "dans"
      ? "Dans la fourchette du marché"
      : position.verdict === "sous"
        ? "Sous la fourchette du marché"
        : "Au-dessus de la fourchette du marché";

  return (
    <div className="rounded-3xl border border-line bg-paper p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-serif text-lg font-semibold text-ink">Multiple effectif</h3>
        <span className="text-[15px] text-muted">{position.segmentLabel}</span>
      </div>

      <p className="tabular mt-4 font-serif text-4xl font-semibold text-ink">
        {position.effective.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
        <span className="ml-2 text-lg font-normal text-muted"> fois les commissions</span>
      </p>

      <div className="relative mt-6 h-2.5 w-full rounded-full bg-surface-alt">
        {/* Fourchette de marché, en fond. */}
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-indigo/25" />
        {/* Position du portefeuille. */}
        <div
          className="absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-indigo-dark"
          style={{ left: `calc(${position.position * 100}% - 2px)` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span className="tabular">
          {position.low.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}
        </span>
        <span className="tabular">
          {position.high.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}
        </span>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        {verdictLabel}. Sur le marché français, un portefeuille de{" "}
        {position.segmentLabel.toLowerCase()} se négocie entre{" "}
        {position.low.toLocaleString("fr-FR", { minimumFractionDigits: 1 })} et{" "}
        {position.high.toLocaleString("fr-FR", { minimumFractionDigits: 1 })} fois les
        commissions annuelles.
      </p>
    </div>
  );
}
