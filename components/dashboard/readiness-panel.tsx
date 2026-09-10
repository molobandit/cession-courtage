import Link from "next/link";
import type { ReadinessAxis } from "@/lib/dashboard/readiness";

/**
 * Où en est le cédant dans sa préparation.
 *
 * Chaque axe est calculé depuis les données réelles, jamais déclaré. Et chaque
 * axe est cliquable : une jauge qui montre un manque sans dire où agir ne sert
 * à rien.
 */
export function ReadinessPanel({
  axes,
  score,
}: {
  axes: ReadinessAxis[];
  score: number;
}) {
  const percent = Math.round(score * 100);
  const circ = 2 * Math.PI * 15.5;
  const dash = `${(percent / 100) * circ} ${circ}`;

  return (
    <section
      aria-label="Préparation à la cession"
      className="rounded-[1.75rem] border border-line bg-paper p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90" aria-hidden="true">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-surface-alt" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="currentColor"
              className="text-indigo"
              strokeWidth="4"
              strokeDasharray={dash}
              strokeLinecap="round"
            />
          </svg>
          <p className="tabular absolute inset-0 flex items-center justify-center text-[15px] font-bold text-ink">
            {percent} %
          </p>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-ink">Votre préparation</h2>
          <p className="mt-1 text-[14px] text-muted">
            Calculée à partir de vos données, jamais déclarée.
          </p>
        </div>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {axes.map((axis) => {
          const done = axis.share >= 1;
          const axisPercent = Math.round(axis.share * 100);
          return (
            <li key={axis.key}>
              <Link
                href={axis.href}
                className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-indigo sm:p-5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium text-ink">{axis.label}</span>
                  <span
                    className={
                      done
                        ? "tabular text-[15px] font-medium text-ok"
                        : "tabular text-[15px] text-muted"
                    }
                  >
                    {done ? "Fait" : `${axisPercent} %`}
                  </span>
                </div>
                <div className="mt-2.5 h-2 w-full rounded-full bg-page">
                  <div
                    className={done ? "h-full rounded-full bg-ok" : "h-full rounded-full bg-indigo"}
                    style={{ width: `${Math.max(axisPercent, done ? 100 : 2)}%` }}
                  />
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{axis.detail}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
