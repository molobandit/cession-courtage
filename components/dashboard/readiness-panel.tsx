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

  return (
    <section aria-label="Préparation à la cession">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold text-ink">
          Votre préparation
        </h2>
        <p className="tabular text-[15px] text-muted">{percent} % prêt</p>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {axes.map((axis) => {
          const done = axis.share >= 1;
          const axisPercent = Math.round(axis.share * 100);
          return (
            <li key={axis.key}>
              <Link
                href={axis.href}
                className="block rounded-3xl border border-line bg-paper p-5 transition-colors hover:border-gold-deep/50"
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
                <div className="mt-2.5 h-2 w-full rounded-full bg-cream">
                  <div
                    className={done ? "h-full rounded-full bg-ok" : "h-full rounded-full bg-[#a8862a]"}
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
