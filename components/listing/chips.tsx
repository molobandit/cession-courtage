/**
 * Groupe de puces, plafonné.
 *
 * Un catalogue concurrent affiche jusqu'à quarante-deux types de risques dans
 * un seul paragraphe : la carte devient illisible et deux annonces ne se
 * distinguent plus. On montre les trois plus lourds, puis un compteur.
 */
export function ChipGroup({
  label,
  items,
  limit = 3,
}: {
  label: string;
  items: string[];
  limit?: number;
}) {
  if (items.length === 0) return null;
  const visible = items.slice(0, limit);
  const hidden = items.length - visible.length;

  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {visible.map((item) => (
          <li
            key={item}
            className="rounded-full border border-line bg-surface-alt px-3 py-1 text-sm text-ink"
          >
            {item}
          </li>
        ))}
        {hidden > 0 ? (
          <li className="rounded-full border border-line bg-surface-alt px-3 py-1 text-sm text-muted">
            et {hidden} autre{hidden > 1 ? "s" : ""}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
