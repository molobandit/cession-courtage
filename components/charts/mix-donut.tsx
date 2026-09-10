import { formatEuroWhole } from "@/lib/format/number";
import type { Share } from "@/lib/portfolio/analytics";

const FILLS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#1e40af"];

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = angle * 2 * Math.PI - Math.PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function slicePath(cx: number, cy: number, r: number, start: number, end: number) {
  const large = end - start > 0.5 ? 1 : 0;
  const s = polar(cx, cy, r, start);
  const e = polar(cx, cy, r, end);
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

export function MixDonut({
  title,
  subtitle,
  shares,
  emptyLabel = "Aucune répartition disponible.",
}: {
  title: string;
  subtitle?: string;
  shares: Share[];
  emptyLabel?: string;
}) {
  const visible = shares.filter((s) => s.share > 0).slice(0, 6);
  let cursor = 0;
  const slices = visible.map((share, i) => {
    const start = cursor;
    const end = Math.min(1, cursor + share.share);
    cursor = end;
    return { ...share, start, end, fill: FILLS[i % FILLS.length]! };
  });

  return (
    <figure className="h-full rounded-3xl border border-line bg-paper p-6">
      <figcaption>
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </figcaption>

      {slices.length === 0 ? (
        <p className="mt-4 text-[15px] text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <svg viewBox="0 0 160 160" className="h-44 w-44 shrink-0" aria-hidden="true">
            {slices.length === 1 ? (
              <circle cx="80" cy="80" r="58" fill={slices[0]!.fill} />
            ) : (
              slices.map((slice) => (
                <path
                  key={slice.label}
                  d={slicePath(80, 80, 72, slice.start, slice.end)}
                  fill={slice.fill}
                />
              ))
            )}
            <circle cx="80" cy="80" r="42" fill="white" />
            <text
              x="80"
              y="76"
              textAnchor="middle"
              className="fill-ink"
              style={{ fontSize: "18px", fontWeight: 700 }}
            >
              {visible.length}
            </text>
            <text x="80" y="96" textAnchor="middle" className="fill-muted" style={{ fontSize: "10px" }}>
              branches
            </text>
          </svg>
          <ul className="w-full min-w-0 space-y-2.5">
            {slices.map((slice) => (
              <li key={slice.label} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: slice.fill }}
                  />
                  <span className="truncate text-[14px] text-ink">{slice.label}</span>
                </span>
                <span className="tabular shrink-0 text-[13px] font-medium text-ink">
                  {(slice.share * 100).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {slices[0] ? (
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          {slices[0].label} pèse {formatEuroWhole(slices[0].value)}, soit{" "}
          {(slices[0].share * 100).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} % des
          commissions.
        </p>
      ) : null}
    </figure>
  );
}
