import { formatCount, formatEuroWhole } from "@/lib/format/number";
import type { Share } from "@/lib/portfolio/analytics";

/**
 * Barres classées, une seule teinte.
 *
 * La longueur porte déjà la grandeur : colorer chaque barre différemment
 * dépenserait le canal de l'identité pour réencoder ce que la barre montre
 * déjà. Les valeurs sont écrites en encre de texte, jamais dans la teinte des
 * marques. « Autres » est un reste : il passe en gris.
 *
 * Même grammaire que le mix par branche : total en tête, rang, contrats,
 * part, ligne de total et une phrase de lecture.
 */
const pourcent = (part: number, chiffres = 0) =>
  `${(part * 100).toLocaleString("fr-FR", { maximumFractionDigits: chiffres, minimumFractionDigits: chiffres })} %`;

export function RankedBars({
  title,
  subtitle,
  shares,
  unit = ["catégorie", "catégories"],
  emptyLabel = "Aucune donnée.",
}: {
  title: string;
  subtitle?: string;
  shares: Share[];
  /** Nom de ce qui est compté, au singulier et au pluriel : « compagnie », « compagnies ». */
  unit?: [string, string];
  emptyLabel?: string;
}) {
  const visibles = shares.filter((s) => s.value > 0);
  const total = visibles.reduce((somme, s) => somme + s.value, 0);
  const contrats = visibles.reduce((somme, s) => somme + s.contracts, 0);
  const nombre = visibles.reduce((n, s) => {
    const reste = /^Autres \((\d+)\)$/.exec(s.label);
    return n + (reste ? Number(reste[1]) : 1);
  }, 0);
  const max = visibles.reduce((m, s) => Math.max(m, s.share), 0);
  const nommees = visibles.filter((s) => !s.label.startsWith("Autres"));
  const tete = nommees[0];
  const seconde = nommees[1];

  return (
    <figure className="flex h-full flex-col rounded-3xl border border-line bg-paper p-6 shadow-sm">
      <figcaption className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {visibles.length ? (
          <div className="shrink-0 text-right">
            <p className="tabular text-[20px] font-bold leading-none text-ink">{formatEuroWhole(total)}</p>
            <p className="mt-1 text-[12px] text-muted">
              commissions / an · {formatCount(nombre)} {nombre > 1 ? unit[1] : unit[0]}
            </p>
          </div>
        ) : null}
      </figcaption>

      {visibles.length === 0 ? (
        <p className="mt-4 text-[15px] text-muted">{emptyLabel}</p>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between border-b border-line pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            <span>Rang · {unit[0]}</span>
            <span>Commissions · part</span>
          </div>
          <ol className="divide-y divide-line/70">
            {visibles.map((s, i) => {
              const reste = s.label.startsWith("Autres");
              const largeur = max > 0 ? (s.share / max) * 100 : 0;
              return (
                <li
                  key={s.label}
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)_4.75rem] items-center gap-x-3 py-2.5"
                  title={`${s.label} — ${formatEuroWhole(s.value)} · ${pourcent(s.share, 1)} · ${formatCount(s.contracts)} contrats`}
                >
                  <span className="tabular text-[12px] font-semibold text-muted">
                    {reste ? "—" : String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[14px] font-medium text-ink">{s.label}</span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {formatCount(s.contracts)} contrat{s.contracts > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-alt">
                      <div
                        className={`h-full rounded-full ${reste ? "bg-slate-400" : i === 0 ? "bg-indigo-dark" : "bg-indigo"}`}
                        style={{ width: `${Math.max(largeur, 1.5)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-[14px] font-semibold text-ink">{pourcent(s.share, 1)}</p>
                    <p className="tabular text-[12px] text-muted">{formatEuroWhole(s.value)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between border-t border-line pt-2 text-[12px] text-muted">
            <span>Total · {formatCount(contrats)} contrats</span>
            <span className="tabular font-semibold text-ink">
              {formatEuroWhole(total)} · 100 %
            </span>
          </div>
        </>
      )}

      <div className="flex-1" />
      {tete ? (
        <p className="mt-4 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
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
