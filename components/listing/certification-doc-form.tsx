"use client";

import { useActionState } from "react";
import {
  uploadCertificationDocumentAction,
  type CertificationFormState,
} from "@/app/actions/certification";
import { Button } from "@/components/ui/button";
import { certificationDocStatusLabel, type CertificationDocRow } from "@/lib/listing/certification-labels";

const initial: CertificationFormState = {};

export function CertificationDocRowForm({
  listingId,
  doc,
}: {
  listingId: string;
  doc: CertificationDocRow;
}) {
  const [state, action, pending] = useActionState(uploadCertificationDocumentAction, initial);

  return (
    <li className="rounded-xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-ink">{doc.label}</p>
          <p className="mt-1 text-[13px] text-muted">
            {doc.required ? "Obligatoire" : "Facultatif"} · {certificationDocStatusLabel(doc.status)}
            {doc.fileName ? ` · ${doc.fileName}` : ""}
          </p>
          {doc.teamComment ? (
            <p className="mt-2 text-[13px] text-muted">Commentaire de l’équipe : {doc.teamComment}</p>
          ) : null}
        </div>
      </div>
      <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="listingId" value={listingId} />
        <input type="hidden" name="documentId" value={doc.id} />
        <input
          type="file"
          name="file"
          accept=".pdf,image/jpeg,image/png"
          required
          className="text-sm"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Dépôt…" : "Déposer"}
        </Button>
      </form>
      {state.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : null}
    </li>
  );
}
