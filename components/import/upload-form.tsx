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
    <form action={action} className="grid max-w-2xl gap-4">
      <div className="grid gap-1">
        <Label htmlFor="file">Fichier CSV ou Excel</Label>
        <Input id="file" name="file" type="file" accept=".csv,.xlsx,.xls" required />
        <p className="mt-1 text-[15px] leading-relaxed text-muted">
          CSV, XLSX ou XLS, 10 Mo au maximum. Les exports des logiciels de courtage sont reconnus, et vous vérifiez
          les colonnes avant l’enregistrement.
        </p>
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Analyse du fichier en cours" : "Déposer le fichier"}
      </Button>
    </form>
  );
}
