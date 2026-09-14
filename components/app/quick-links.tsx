import Link from "next/link";

/**
 * Raccourcis d'une famille de pages, en pastilles sous le titre.
 *
 * Le menu ne garde que les grandes intentions ; les écrans secondaires (ma
 * recherche, correspondances, demandes, outils…) restent à un clic depuis
 * la page de leur famille.
 */
export function QuickLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <nav aria-label="Raccourcis" className="mt-4 flex flex-wrap gap-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="inline-flex min-h-10 items-center rounded-full border border-line bg-paper px-4 text-[14px] font-medium text-ink hover:border-indigo hover:text-indigo-dark"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
