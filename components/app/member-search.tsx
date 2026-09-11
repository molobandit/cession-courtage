"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IconSearch } from "@/components/app/member-icons";

function MemberSearchFields() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";

  return (
    <form action="/annonces" method="get" className="relative min-w-0 flex-1">
      <label htmlFor="member-catalogue-q" className="sr-only">
        Rechercher un portefeuille
      </label>
      <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        id="member-catalogue-q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Rechercher un portefeuille"
        autoComplete="off"
        className="h-10 w-full rounded-full border border-line bg-surface-alt pl-10 pr-4 text-[14px] text-ink outline-none placeholder:text-muted focus:border-indigo focus:bg-surface"
      />
      <button type="submit" className="sr-only">
        Lancer la recherche
      </button>
    </form>
  );
}

export function MemberSearch() {
  return (
    <Suspense
      fallback={
        <div className="h-10 min-w-0 flex-1 rounded-full border border-line bg-surface-alt" />
      }
    >
      <MemberSearchFields />
    </Suspense>
  );
}
