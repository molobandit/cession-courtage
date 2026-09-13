"use client";

import { useActionState, useRef, useState } from "react";
import { uploadAccountDocumentAction, type AccountVerificationState } from "@/app/actions/account-verification";
import { Button } from "@/components/ui/button";

const initial: AccountVerificationState = {};

export function AccountDocumentUpload({ kind, replace }: { kind: string; replace: boolean }) {
  const [state, action, pending] = useActionState(uploadAccountDocumentAction, initial);
  const [nom, setNom] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form action={action} className="grid gap-1">
      <input type="hidden" name="kind" value={kind} />
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
          {nom ? "Changer de fichier" : replace ? "Remplacer…" : "Choisir un fichier…"}
        </button>
        {nom ? (
          <>
            <span className="max-w-[14rem] truncate text-[13px] text-muted">{nom}</span>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Dépôt…" : "Déposer"}
            </Button>
          </>
        ) : null}
      </div>
      {state.error ? <p className="text-[13px] font-medium text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-[13px] font-medium text-ok">{state.ok}</p> : null}
    </form>
  );
}
