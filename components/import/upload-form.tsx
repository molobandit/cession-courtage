"use client";

import { useActionState } from "react";
import { uploadPortfolioFileAction, type ImportFormState } from "@/app/actions/import-portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ImportFormState = {};

export function UploadPortfolioForm() {
  const [state, action, pending] = useActionState(uploadPortfolioFileAction, initial);

  return (
    <form action={action} className="grid max-w-lg gap-3">
      <div className="grid gap-1">
        <Label htmlFor="file">Fichier CSV ou Excel</Label>
        <Input id="file" name="file" type="file" accept=".csv,.xlsx,.xls" required />
        <p className="text-xs text-muted">
          10 Mo maximum. UTF-8 ou Windows-1252. Séparateur virgule ou point-virgule. Aucune colonne
          nominative (nom, e-mail, adresse, téléphone).
        </p>
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Analyse du fichier…" : "Déposer le fichier"}
      </Button>
    </form>
  );
}
