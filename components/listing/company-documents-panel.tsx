"use client";

import { useActionState } from "react";
import { uploadCompanyDocumentAction, type CompanyDocFormState } from "@/app/actions/company-docs";
import { Button } from "@/components/ui/button";
import { COMPANY_DOC_KINDS, companyDocLabel, type CompanyDocRow } from "@/lib/listing/company-doc-kinds";

const initial: CompanyDocFormState = {};

export function CompanyDocumentsPanel({
  listingId,
  docs,
  canUpload,
  canDownload,
}: {
  listingId: string;
  docs: CompanyDocRow[];
  canUpload: boolean;
  canDownload: boolean;
}) {
  return (
    <section className="rounded-[1.75rem] border border-line bg-paper p-5 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight text-ink">Pièces du cabinet</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        PDF uniquement. Accessibles à l’acquéreur après le dépôt de 2,5 % du
        prix. Aucun nom d’assuré.
      </p>
      {docs.length > 0 ? (
        <ul className="mt-4 divide-y divide-line">
          {docs.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-[14px] font-medium text-ink">{companyDocLabel(doc.kind)}</p>
                <p className="text-[13px] text-muted">{doc.fileName}</p>
              </div>
              {canDownload ? (
                <a
                  href={`/api/cabinet/${listingId}/${doc.id}`}
                  className="text-[14px] font-medium text-indigo-dark hover:underline"
                >
                  Ouvrir le PDF
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[14px] text-muted">Aucune pièce déposée pour le moment.</p>
      )}
      {canUpload ? <CompanyDocUpload listingId={listingId} /> : null}
    </section>
  );
}

function CompanyDocUpload({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(uploadCompanyDocumentAction, initial);
  return (
    <form action={action} className="mt-5 grid gap-3 rounded-2xl bg-surface-alt p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <input type="hidden" name="listingId" value={listingId} />
      <div>
        <label htmlFor="kind" className="text-[13px] font-medium text-ink">
          Type de pièce
        </label>
        <select
          id="kind"
          name="kind"
          required
          className="mt-1.5 h-11 w-full rounded-xl border border-line bg-paper px-3 text-[14px]"
        >
          {COMPANY_DOC_KINDS.map((item) => (
            <option key={item.kind} value={item.kind}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <input
        type="file"
        name="file"
        accept="application/pdf,.pdf"
        required
        className="text-sm"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Dépôt…" : "Déposer"}
      </Button>
      {state.error ? <p className="sm:col-span-3 text-sm text-danger">{state.error}</p> : null}
      {state.ok ? <p className="sm:col-span-3 text-sm text-ok">Pièce enregistrée.</p> : null}
    </form>
  );
}
