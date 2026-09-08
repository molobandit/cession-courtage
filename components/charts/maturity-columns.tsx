import { formatCount, formatEuroWhole } from "@/lib/format/number";
import type { MaturityBucket } from "@/lib/portfolio/analytics";

/**
 * Échéancier des renouvellements sur douze mois.
 *
 * Une seule teinte : c'est une grandeur dans le temps, pas des identités à
 * distinguer. Seules les colonnes les plus lourdes portent une étiquette, pour
 * ne pas couvrir le graphique de chiffres.
 */
export function MaturityColumns({ buckets }: { buckets: MaturityBucket[] }) {
  const max = buckets.reduce((m, b) => Math.max(m, b.commissions), 0);
  const total = buckets.reduce((sum, b) => sum + b.commissions, 0);
  const peak = buckets.reduce(
    (best, b) => (b.commissions > best.commissions ? b : best),
    buckets[0],
  );

  return (
    <figure className="rounded-3xl border border-line bg-paper p-6">
      <figcaption>
        <h3 className="font-serif text-lg font-semibold text-ink">
          Échéancier des renouvellements
        </h3>
        <p className="mt-1 text-sm text-muted">
          Commissions dont l’échéance tombe dans les douze prochains mois. C’est là
          que se joue la rétention qu’un acquéreur paiera.
        </p>
      </figcaption>

      {max <= 0 ? (
        <p className="mt-4 text-[15px] text-muted">
          Aucune échéance renseignée sur les douze prochains mois.
        </p>
      ) : (
        <>
          <div className="mt-6 flex h-44 items-end gap-1.5" role="img" aria-label="Échéancier">
            {buckets.map((bucket) => {
              const height = max > 0 ? (bucket.commissions / max) * 100 : 0;
              const isPeak = bucket.month === peak?.month && bucket.commissions > 0;
              return (
                // L'etiquette suit sa colonne : posee juste au-dessus, jamais
                // flottante en haut du cadre.
                <div
                  key={bucket.month}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                  style={{ height: "100%" }}
                >
                  {isPeak ? (
                    <span className="tabular whitespace-nowrap text-[11px] font-medium text-ink">
                      {formatEuroWhole(bucket.commissions)}
                    </span>
                  ) : null}
                  <div
                    className="w-full rounded-t bg-[#a8862a]"
                    style={{ height: `${Math.max(height * 0.88, bucket.commissions > 0 ? 2 : 0)}%` }}
                    title={`${bucket.label} : ${formatEuroWhole(bucket.commissions)}, ${bucket.contracts} contrats`}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex gap-1.5 border-t border-line pt-2">
            {buckets.map((bucket) => (
              <span
                key={bucket.month}
                className="flex-1 text-center text-[11px] text-muted"
              >
                {bucket.label}
              </span>
            ))}
          </div>

          <p className="mt-5 text-[15px] leading-relaxed text-muted">
            {formatEuroWhole(total)} de commissions se renouvellent sur la période,
            avec un point haut en {peak?.label} à {formatEuroWhole(peak?.commissions ?? 0)}
            {" "}
            sur {formatCount(peak?.contracts ?? 0)} contrat
            {(peak?.contracts ?? 0) > 1 ? "s" : ""}.
          </p>
        </>
      )}
    </figure>
  );
}
