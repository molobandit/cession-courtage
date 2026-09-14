"use client";

import { useActionState, useRef, useState } from "react";
import { declarerCapaciteAction, type CapaciteState } from "@/app/actions/financial-capacity";
import { Button } from "@/components/ui/button";
import { keepFormSubmit } from "@/components/ui/keep-form";
import { MODES_FINANCEMENT } from "@/lib/buyer/financial-capacity";

const initial: CapaciteState = {};

/**
 * Capacité d'acquisition, mode de financement et justificatif, en un formulaire.
 *
 * Déclarer n'est pas être vérifié : le texte le dit, et l'acquéreur sait que
 * l'équipe contrôlera la pièce avant d'afficher « financement vérifié ».
 */
export function CapacityForm({
  montantActuel,
  libelle,
  note,
  modeActuel,
  justificatif,
}: {
  montantActuel: number | null;
  libelle: string;
  note: string | null;
  modeActuel: string | null;
  justificatif: { id: string; fileName: string; createdAt: Date } | null;
}) {
  const [state, action, pending] = useActionState(declarerCapaciteAction, initial);
  const [mode, setMode] = useState(modeActuel ?? "CREDIT");
  const [nom, setNom] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const piece = MODES_FINANCEMENT.find((m) => m.value === mode)?.piece ?? "Justificatif de financement";

  return (
    <div className="mt-4">
      <p className="text-[15px] font-medium text-ink">
        {libelle}
        {montantActuel !== null ? <span className="tabular text-muted"> · {montantActuel.toLocaleString("fr-FR")} €</span> : null}
      </p>
      {note ? <p className="mt-1 text-[14px] text-muted">{note}</p> : null}

      <form onSubmit={keepFormSubmit(action)} className="mt-4 grid gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1 text-[14px] text-muted">
            Capacité d’acquisition, en euros
            <input
              name="montant"
              type="text"
              inputMode="numeric"
              placeholder="200 000"
              defaultValue={montantActuel !== null ? String(montantActuel) : ""}
              className="tabular h-11 w-44 rounded-full border border-line bg-surface px-4 text-[15px] text-ink"
            />
          </label>
          <label className="grid gap-1 text-[14px] text-muted">
            Mode de financement
            <select
              name="financingMode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="h-11 rounded-full border border-line bg-surface px-4 text-[15px] text-ink"
            >
              {MODES_FINANCEMENT.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-1.5">
          <p className="text-[14px] text-muted">{piece}</p>
          {justificatif ? (
            <p className="text-[13px]">
              <a href={`/api/compte/documents/${justificatif.id}`} target="_blank" rel="noreferrer" className="font-medium text-indigo-dark underline-offset-2 hover:underline">
                {justificatif.fileName}
              </a>{" "}
              <span className="text-muted">· déposé le {new Date(justificatif.createdAt).toLocaleDateString("fr-FR")}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={ref}
              type="file"
              name="file"
              accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={(e) => setNom(e.target.files?.[0]?.name ?? null)}
            />
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="inline-flex h-9 items-center rounded-full border border-line bg-paper px-3.5 text-[13px] font-medium text-ink hover:border-indigo"
            >
              {nom ? "Changer de fichier" : justificatif ? "Remplacer le justificatif…" : "Choisir le justificatif…"}
            </button>
            {nom ? <span className="max-w-[16rem] truncate text-[13px] text-muted">{nom}</span> : null}
          </div>
        </div>
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer mon financement"}
          </Button>
        </div>
      </form>

      {state.error ? (
        <p role="alert" className="mt-3 text-[15px] text-danger">
          {state.error}
        </p>
      ) : null}
      {state.done ? (
        <p className="mt-3 text-[15px] text-ok">
          Financement enregistré : vous pouvez vous engager. Il sera contrôlé avant d’être affiché « vérifié » aux cédants.
        </p>
      ) : null}
    </div>
  );
}
