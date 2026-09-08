import Link from "next/link";

export type SummaryRow = {
  id: string;
  href: string;
  /** Titre complet, jamais tronqué : deux dossiers doivent se distinguer. */
  title: string;
  subtitle?: string;
  /** Deux à trois faits, pas davantage. */
  facts: { label: string; value: string }[];
  badge?: { label: string; tone: "neutre" | "attention" | "ok" };
};

const BADGE_TONE = {
  neutre: "border-line bg-cream text-ink",
  attention: "border-gold-deep/40 bg-gold/15 text-gold-deep",
  ok: "border-ok/30 bg-ok/10 text-ok",
} as const;

/**
 * Liste courte d'entités, en cartes.
 *
 * Trois éléments au maximum : au delà, le tableau de bord devient un inventaire
 * et l'utilisateur ne voit plus ce qui compte. Le reste vit sur sa propre page.
 */
export function SummaryList({
  title,
  action,
  rows,
  empty,
  limit = 3,
}: {
  title: string;
  action?: { href: string; label: string };
  rows: SummaryRow[];
  empty: { text: string; href: string; label: string };
  limit?: number;
}) {
  const visible = rows.slice(0, limit);
  const hidden = rows.length - visible.length;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold text-ink">
          {title}
          {rows.length > 0 ? (
            <span className="tabular ml-2.5 text-[15px] font-normal text-muted">
              {rows.length}
            </span>
          ) : null}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="text-[15px] font-medium text-gold-deep underline-offset-4 hover:underline"
          >
            {action.label}
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-line bg-paper p-6">
          <p className="text-[15px] leading-relaxed text-muted">{empty.text}</p>
          <Link
            href={empty.href}
            className="mt-3 inline-block text-[15px] font-medium text-gold-deep underline-offset-4 hover:underline"
          >
            {empty.label}
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 grid gap-3">
            {visible.map((row) => (
              <li key={row.id}>
                <Link
                  href={row.href}
                  className="block rounded-3xl border border-line bg-paper p-5 transition-colors hover:border-gold-deep/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-medium text-ink">{row.title}</p>
                      {row.subtitle ? (
                        <p className="mt-0.5 text-sm text-muted">{row.subtitle}</p>
                      ) : null}
                    </div>
                    {row.badge ? (
                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-sm ${BADGE_TONE[row.badge.tone]}`}
                      >
                        {row.badge.label}
                      </span>
                    ) : null}
                  </div>

                  <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-2 border-t border-line pt-3.5">
                    {row.facts.map((fact) => (
                      <div key={fact.label}>
                        <dt className="text-sm text-muted">{fact.label}</dt>
                        <dd className="tabular mt-0.5 text-[15px] text-ink">{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
          {hidden > 0 && action ? (
            <p className="mt-3 text-[15px] text-muted">
              {hidden} autre{hidden > 1 ? "s" : ""} non affiché{hidden > 1 ? "s" : ""}.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
