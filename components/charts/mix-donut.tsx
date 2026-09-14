import { formatCount, formatEuroWhole } from "@/lib/format/number";
import type { Share } from "@/lib/portfolio/analytics";

/**
 * Palette catégorielle, dans un ordre fixe.
 *
 * Six nuances de bleu se confondaient dès la troisième branche : l'œil ne
 * pouvait plus relier une part à sa ligne. Chaque branche a désormais une
 * teinte franche, distincte aussi en luminosité, et la couleur suit le rang
 * dans la répartition. « Autres » reste en gris neutre : ce n'est pas une
 * branche, c'est un reste.
 */
const PALETTE = ["#2563eb", "#0d9488", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#65a30d"];
const RESTE = "#94a3b8";

const pourcent = (part: number, chiffres = 0) =>
  `${(part * 100).toLocaleString("fr-FR", { maximumFractionDigits: chiffres, minimumFractionDigits: chiffres })} %`;

function point(cx: number, cy: number, r: number, t: number) {
  const a = t * 2 * Math.PI - Math.PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Secteur d'anneau entre deux fractions de tour, rayon intérieur et extérieur. */
function arc(cx: number, cy: number, rOut: number, rIn: number, start: number, end: number) {
  const grand = end - start > 0.5 ? 1 : 0;
  const a = point(cx, cy, rOut, start);
  const b = point(cx, cy, rOut, end);
  const c = point(cx, cy, rIn, end);
  const d = point(cx, cy, rIn, start);
  return [
    `M ${a.x} ${a.y}`,
    `A ${rOut} ${rOut} 0 ${grand} 1 ${b.x} ${b.y}`,
    `L ${c.x} ${c.y}`,
    `A ${rIn} ${rIn} 0 ${grand} 0 ${d.x} ${d.y}`,
    "Z",
  ].join(" ");
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
  const visibles = shares.filter((s) => s.share > 0);
  const total = visibles.reduce((somme, s) => somme + s.value, 0);
  const contrats = visibles.reduce((somme, s) => somme + s.contracts, 0);
  const nombreBranches = visibles.reduce((n, s) => {
    const reste = /^Autres \((\d+)\)$/.exec(s.label);
    return n + (reste ? Number(reste[1]) : 1);
  }, 0);
  const plusGrande = Math.max(...visibles.map((s) => s.share), 0);

  // Un espace fin entre les parts, sauf quand il n'y en a qu'une.
  const ecart = visibles.length > 1 ? 0.004 : 0;
  let curseur = 0;
  let rang = 0;
  const parts = visibles.map((s) => {
    const estReste = s.label.startsWith("Autres");
    const couleur = estReste ? RESTE : PALETTE[rang++ % PALETTE.length]!;
    const debut = curseur;
    const fin = Math.min(1, curseur + s.share);
    curseur = fin;
    return { ...s, couleur, debut: debut + ecart, fin: Math.max(debut + ecart, fin - ecart) };
  });

  const tete = parts.find((p) => !p.label.startsWith("Autres")) ?? parts[0];
  const seconde = parts.filter((p) => !p.label.startsWith("Autres"))[1];

  return (
    <figure className="@container flex h-full flex-col rounded-3xl border border-line bg-paper p-6 shadow-sm">
      <figcaption className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {parts.length ? (
          <div className="shrink-0 text-right">
            <p className="tabular text-[20px] font-bold leading-none text-ink">{formatEuroWhole(total)}</p>
            <p className="mt-1 text-[12px] text-muted">
              commissions / an · {formatCount(nombreBranches)} branche{nombreBranches > 1 ? "s" : ""}
            </p>
          </div>
        ) : null}
      </figcaption>

      {parts.length === 0 ? (
        <p className="mt-4 text-[15px] text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-6 grid items-center gap-6 @[34rem]:grid-cols-[11rem_minmax(0,1fr)]">
          <svg viewBox="0 0 200 200" className="mx-auto h-44 w-44" role="img" aria-label={`Répartition par branche : ${parts.map((p) => `${p.label} ${pourcent(p.share)}`).join(", ")}`}>
            <circle cx="100" cy="100" r="80" fill="none" stroke="#eef2f7" strokeWidth="30" />
            {parts.length === 1 ? (
              <circle cx="100" cy="100" r="80" fill="none" stroke={parts[0]!.couleur} strokeWidth="30">
                <title>{`${parts[0]!.label} : ${formatEuroWhole(parts[0]!.value)} · ${pourcent(parts[0]!.share)}`}</title>
              </circle>
            ) : (
              parts.map((p) => (
                <path key={p.label} d={arc(100, 100, 95, 65, p.debut, p.fin)} fill={p.couleur} className="transition-opacity hover:opacity-80">
                  <title>{`${p.label} : ${formatEuroWhole(p.value)} · ${pourcent(p.share, 1)} · ${formatCount(p.contracts)} contrats`}</title>
                </path>
              ))
            )}
            {tete ? (
              <>
                <text x="100" y="98" textAnchor="middle" className="fill-ink tabular" style={{ fontSize: "28px", fontWeight: 700 }}>
                  {pourcent(tete.share)}
                </text>
                <text x="100" y="119" textAnchor="middle" className="fill-muted" style={{ fontSize: "11px" }}>
                  {tete.label.length > 18 ? `${tete.label.slice(0, 17)}…` : tete.label}
                </text>
              </>
            ) : null}
          </svg>

          <div className="min-w-0 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  <th scope="col" className="pb-2 pr-2 font-semibold">Branche</th>
                  <th scope="col" className="pb-2 pr-2 text-right font-semibold">Commissions</th>
                  <th scope="col" className="pb-2 text-right font-semibold">Part</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.label} className="border-b border-line/70 last:border-0">
                    <th scope="row" className="py-2 pr-2 font-normal">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.couleur }} />
                        <span className="truncate text-ink">{p.label}</span>
                      </span>
                      <span className="ml-[1.1rem] block text-[11px] text-muted">
                        {formatCount(p.contracts)} contrat{p.contracts > 1 ? "s" : ""}
                      </span>
                    </th>
                    <td className="tabular py-2 pr-2 text-right font-medium text-ink">{formatEuroWhole(p.value)}</td>
                    <td className="py-2 text-right">
                      <span className="tabular font-semibold text-ink">{pourcent(p.share)}</span>
                      <span className="mt-1 ml-auto block h-1 w-16 overflow-hidden rounded-full bg-surface-alt">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${plusGrande ? (p.share / plusGrande) * 100 : 0}%`, background: p.couleur }}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-[12px] text-muted">
                  <td className="pt-2">Total · {formatCount(contrats)} contrats</td>
                  <td className="tabular pt-2 pr-2 text-right font-semibold text-ink">{formatEuroWhole(total)}</td>
                  <td className="tabular pt-2 text-right font-semibold text-ink">100 %</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {tete && tete.share >= 0.995 ? (
        <p className="mt-auto border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
          <span className="font-medium text-ink">{tete.label}</span> porte la totalité des commissions
          ({formatEuroWhole(tete.value)} / an).
        </p>
      ) : tete ? (
        <p className="mt-auto border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
          <span className="font-medium text-ink">{tete.label}</span> arrive en tête avec{" "}
          {pourcent(tete.share)} des commissions ({formatEuroWhole(tete.value)} / an)
          {seconde ? (
            <>
              , devant <span className="font-medium text-ink">{seconde.label}</span> ({pourcent(seconde.share)})
            </>
          ) : null}
          .
        </p>
      ) : null}
    </figure>
  );
}
