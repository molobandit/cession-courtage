"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format/number";
import { finalizeImportAction, importBatchAction } from "@/app/actions/import-portfolio";

type Phase = "pret" | "encours" | "pause" | "termine" | "erreur";

export type ImportProgressProps = {
  importId: string;
  totalRows: number;
  processedRows: number;
};

/**
 * Pilote l'insertion par lots.
 *
 * Un import de 50 000 lignes demande près de deux minutes : il ne peut pas tenir
 * dans une seule requête. Le navigateur enchaîne donc les tranches et affiche
 * l'avancement. Chaque tranche est rejouable, donc une coupure ne fait perdre
 * que la tranche en cours.
 */
export function ImportProgress({ importId, totalRows, processedRows }: ImportProgressProps) {
  const router = useRouter();
  const [processed, setProcessed] = useState(processedRows);
  const [phase, setPhase] = useState<Phase>(processedRows > 0 ? "pause" : "pret");
  const [message, setMessage] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(0);
  const running = useRef(false);

  const percent = totalRows > 0 ? Math.min(100, Math.round((processed / totalRows) * 100)) : 0;

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setPhase("encours");
    setMessage(null);

    try {
      let done = false;
      while (!done) {
        const result = await importBatchAction(importId);
        if (result.error) {
          setMessage(result.error);
          setPhase("erreur");
          return;
        }
        setProcessed(result.processedRows ?? 0);
        if (result.skipped) setSkipped((n) => n + result.skipped!);
        done = Boolean(result.done);
      }

      const final = await finalizeImportAction(importId);
      if (final.error) {
        setMessage(final.error);
        setPhase("erreur");
        return;
      }
      setPhase("termine");
      router.push(`/app/portefeuilles/${final.portfolioId}`);
    } catch {
      setMessage(
        "La connexion a été interrompue. Les lignes déjà enregistrées sont conservées, vous pouvez reprendre.",
      );
      setPhase("erreur");
    } finally {
      running.current = false;
    }
  }, [importId, router]);

  // Démarrage automatique quand rien n'a encore été inséré.
  useEffect(() => {
    if (phase === "pret") void run();
  }, [phase, run]);

  return (
    <section className="rounded-3xl border border-line bg-paper p-6" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold text-ink">
          {phase === "termine" ? "Import terminé" : "Enregistrement des lignes"}
        </h2>
        <p className="tabular text-[15px] text-muted">
          {formatCount(processed)} sur {formatCount(totalRows)} lignes
        </p>
      </div>

      <div
        className="mt-4 h-3 w-full overflow-hidden rounded-full bg-cream"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalRows}
        aria-valuenow={processed}
        aria-label="Avancement de l’import"
      >
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-3 text-[15px] text-muted">
        {phase === "encours"
          ? "Enregistrement en cours. Laissez cette page ouverte."
          : null}
        {phase === "pause"
          ? "Cet import a été interrompu. Les lignes déjà enregistrées sont conservées."
          : null}
        {phase === "termine" ? "Toutes les lignes sont enregistrées." : null}
        {phase === "pret" ? "Préparation." : null}
      </p>

      {skipped > 0 ? (
        <p className="mt-2 text-[15px] text-muted">
          {formatCount(skipped)} ligne{skipped > 1 ? "s" : ""} ignorée
          {skipped > 1 ? "s" : ""}, faute de données exploitables.
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-3xl border border-danger/40 bg-danger/5 p-4 text-[15px] text-ink">
          {message}
        </p>
      ) : null}

      {phase === "erreur" || phase === "pause" ? (
        <Button variant="gold" className="mt-5" onClick={() => void run()}>
          Reprendre l’enregistrement
        </Button>
      ) : null}
    </section>
  );
}
