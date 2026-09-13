"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToolIcon } from "@/components/app/toolbox";
import { PAGE_SIZES } from "@/lib/direct/services";

const SELECT =
  "h-10 rounded-lg border border-line bg-paper px-3 text-[15px] text-ink focus:border-indigo focus:outline-none";

/** Tri et taille de page, appliqués dès qu'on change de valeur. */
export function ListControls({
  tri,
  ordre,
  parPage,
}: {
  tri: string;
  ordre: string;
  parPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function appliquer(changes: Record<string, string>) {
    const suivants = new URLSearchParams(params.toString());
    for (const [cle, valeur] of Object.entries(changes)) suivants.set(cle, valeur);
    suivants.delete("page");
    router.push(`${pathname}?${suivants.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <label htmlFor="tri" className="text-[15px] text-ink">
          Trier par:
        </label>
        <select id="tri" value={tri} onChange={(e) => appliquer({ tri: e.currentTarget.value })} className={SELECT}>
          <option value="createdAt">Date de création</option>
          <option value="updatedAt">Dernière mise à jour</option>
        </select>
        <button
          type="button"
          onClick={() => appliquer({ ordre: ordre === "asc" ? "desc" : "asc" })}
          aria-label={ordre === "asc" ? "Ordre croissant" : "Ordre décroissant"}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-paper text-ink hover:bg-surface-alt"
        >
          <ToolIcon name="arrow-left" className={`h-4 w-4 ${ordre === "asc" ? "rotate-90" : "-rotate-90"}`} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="parPage" className="text-[15px] text-ink">
          Par page
        </label>
        <select
          id="parPage"
          value={parPage}
          onChange={(e) => appliquer({ parPage: e.currentTarget.value })}
          className={SELECT}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
