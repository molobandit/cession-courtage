import { formatEuroWhole } from "@/lib/format/number";
import type { Share } from "@/lib/portfolio/analytics";

/**
 * Barres classées, une seule teinte.
 *
 * La longueur porte déjà la grandeur : colorer chaque barre différemment
 * dépenserait le canal de l'identité pour réencoder ce que la barre montre
 * déjà. Les valeurs sont écrites en encre de texte, jamais dans la teinte des
 * marques.
 */
export function RankedBars({
  title,
  subtitle,
  shares,
  emptyLabel = "Aucune donnée.",
}: {
  title: string;
  subtitle?: string;
  shares: Share[];
  emptyLabel?: string;
}) {
  const max = shares.reduce((m, s) => Math.max(m, s.share), 0);

  return (
    <figure className="rounded-3xl border border-line bg-paper p-6">
      <figcaption>
        <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </figcaption>

      {shares.length === 0 ? (
        <p className="mt-4 text-[15px] text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {shares.map((share) => {
            const width = max > 0 ? (share.share / max) * 100 : 0;
            return (
              <li key={share.label}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[15px] text-ink">{share.label}</span>
                  <span className="tabular shrink-0 text-[15px] text-muted">
                    {formatEuroWhole(share.value)}
                    <span className="ml-2 text-ink">
                      {(share.share * 100).toLocaleString("fr-FR", {
                        maximumFractionDigits: 1,
                      })}
                      {" %"}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full rounded-full bg-cream">
                  <div
                    className="h-full rounded-full bg-indigo"
                    style={{ width: `${Math.max(width, 1.5)}%` }}
                    title={`${share.label} : ${formatEuroWhole(share.value)}, ${share.contracts} contrats`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}
