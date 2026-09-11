"use client";

import { useActionState } from "react";
import { declarerCapaciteAction, type CapaciteState } from "@/app/actions/financial-capacity";
import { Button } from "@/components/ui/button";

const initial: CapaciteState = {};

/**
 * Déclaration de capacité d'acquisition.
 *
 * Le texte sépare explicitement déclarer et être vérifié : l'acquéreur doit
 * comprendre qu'il annonce un montant et que l'éditeur le contrôlera. Laisser
 * croire que la déclaration vaut vérification viderait la mention de son sens.
 */
export function CapacityForm({
  montantActuel,
  libelle,
  note,
}: {
  montantActuel: number | null;
  libelle: string;
  note: string | null;
}) {
  const [state, action, pending] = useActionState(declarerCapaciteAction, initial);

  return (
    <div className="mt-4">
      <p className="text-[15px] text-ink">
        {libelle}
        {montantActuel !== null ? (
          <span className="tabular text-muted">
            {" · "}
            {montantActuel.toLocaleString("fr-FR")} €
          </span>
        ) : null}
      </p>
      {note ? <p className="mt-1 text-[14px] text-muted">{note}</p> : null}

      <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="montant" className="block text-[14px] text-muted">
            Capacité d’acquisition, en euros
          </label>
          <input
            id="montant"
            name="montant"
            type="text"
            inputMode="numeric"
            placeholder="200 000"
            defaultValue={montantActuel !== null ? String(montantActuel) : ""}
            className="tabular mt-1 h-11 w-44 rounded-full border border-line bg-surface px-4 text-[15px] text-ink"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Déclarer"}
        </Button>
      </form>

      {state.error ? (
        <p role="alert" className="mt-3 text-[15px] text-danger">
          {state.error}
        </p>
      ) : null}
      {state.done ? (
        <p className="mt-3 text-[15px] text-ok">
          Déclaration enregistrée. Elle sera contrôlée avant d’être affichée aux cédants.
        </p>
      ) : null}
    </div>
  );
}
