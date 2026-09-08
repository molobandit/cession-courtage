"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start px-4 py-20">
      <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-danger">
        Incident technique
      </p>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-ink">
        Cette page n’a pas pu s’afficher
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Aucune donnée n’a été modifiée. Vous pouvez réessayer, l’incident est le
        plus souvent passager.
      </p>
      {error.digest ? (
        <p className="tabular mt-3 text-sm text-muted">
          Référence à communiquer au support : {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="gold" onClick={reset}>
          Réessayer
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Retour à l’accueil</Link>
        </Button>
      </div>
    </main>
  );
}
