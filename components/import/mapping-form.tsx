"use client";

import { useActionState } from "react";
import {
  confirmPortfolioImportAction,
  saveColumnMappingAction,
  type ImportFormState,
} from "@/app/actions/import-portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FIELD_META, type ColumnMapping, type TargetField } from "@/lib/import/types";

const initial: ImportFormState = {};

const selectClass =
  "flex h-9 w-full rounded-sm border border-line bg-paper px-2.5 text-sm text-ink outline-none focus:border-navy focus:ring-1 focus:ring-navy";

export function MappingForm({
  importId,
  headers,
  mapping,
  defaultLabel,
  canConfirm,
}: {
  importId: string;
  headers: string[];
  mapping: ColumnMapping;
  defaultLabel: string;
  canConfirm: boolean;
}) {
  const [saveState, saveAction, saving] = useActionState(saveColumnMappingAction, initial);
  const [confirmState, confirmAction, confirming] = useActionState(confirmPortfolioImportAction, initial);
  const error = confirmState.error ?? saveState.error;

  return (
    <form action={confirmAction} className="grid gap-5">
      <input type="hidden" name="importId" value={importId} />

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELD_META.map((field) => (
          <div key={field.key} className="grid gap-1">
            <Label htmlFor={`map_${field.key}`}>
              {field.label}
              {field.required ? " *" : ""}
            </Label>
            <select
              id={`map_${field.key}`}
              name={`map_${field.key}`}
              defaultValue={mapping[field.key as TargetField] ?? ""}
              className={selectClass}
            >
              <option value="">— Non associé —</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted">{field.help}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="label">Libellé du portefeuille</Label>
          <Input id="label" name="label" defaultValue={defaultLabel} maxLength={120} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="churnRate12m">Résiliation 12 mois (%)</Label>
          <Input id="churnRate12m" name="churnRate12m" inputMode="decimal" placeholder="ex. 8,5" />
          <p className="text-xs text-muted">Optionnel. Saisie en pourcentage, ex. 8,5 pour 8,5 %.</p>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" formAction={saveAction} variant="outline" disabled={saving || confirming}>
          {saving ? "Enregistrement…" : "Enregistrer la correspondance"}
        </Button>
        <Button type="submit" disabled={!canConfirm || saving || confirming}>
          {confirming ? "Import en cours…" : "Importer le portefeuille"}
        </Button>
      </div>
    </form>
  );
}
