"use client";

import { useActionState } from "react";
import { saveDirectCarriersAction, type DirectDealState } from "@/app/actions/direct-deals";
import { Button } from "@/components/ui/button";
import { MAX_TRANSFER_CARRIERS } from "@/lib/direct/services";

const initial: DirectDealState = {};

/**
 * Compagnies à transférer.
 *
 * Une zone de texte plutôt qu'une ligne de champs par compagnie : la liste
 * sort presque toujours d'un tableur, et se colle d'un geste.
 */
export function CarriersForm({
  dealId,
  initialLines,
  initialDate,
}: {
  dealId: string;
  initialLines: string;
  initialDate: string;
}) {
  const [state, action, pending] = useActionState(saveDirectCarriersAction, initial);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="dealId" value={dealId} />
      <div>
        <label htmlFor="carriers" className="text-[14px] font-medium text-ink">
          Compagnies et codes courtier du cédant
        </label>
        <p className="mt-0.5 text-[13px] text-muted">
          Une compagnie par ligne, le code après un point-virgule. Jusqu’à {MAX_TRANSFER_CARRIERS}.
        </p>
        <textarea
          id="carriers"
          name="carriers"
          rows={5}
          defaultValue={initialLines}
          placeholder={"AXA ; 123456\nGenerali ; 98-765\nAlptis"}
          className="mt-2 w-full rounded-md border border-line bg-surface-alt px-4 py-3 font-mono text-[14px] text-ink"
        />
      </div>
      <div className="max-w-xs">
        <label htmlFor="effectiveDate" className="text-[14px] font-medium text-ink">
          Date d’effet du transfert
        </label>
        <input
          id="effectiveDate"
          name="effectiveDate"
          type="date"
          defaultValue={initialDate}
          className="mt-2 h-11 w-full rounded-md border border-line bg-surface-alt px-4 text-[15px] text-ink"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {state.id && !state.error ? (
          <span className="text-[13px] text-ok">Enregistré.</span>
        ) : null}
      </div>
      {state.error ? (
        <p role="alert" className="text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
