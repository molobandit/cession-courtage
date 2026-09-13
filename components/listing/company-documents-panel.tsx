"use client";

import { useActionState } from "react";
import { uploadCompanyDocumentAction, type CompanyDocFormState } from "@/app/actions/company-docs";
import { Button } from "@/components/ui/button";
import { COMPANY_DOC_KINDS, DATA_ROOM_KINDS, companyDocLabel, type CompanyDocRow } from "@/lib/listing/company-doc-kinds";

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
  const byKind = new Map(docs.map((doc) => [doc.kind, doc]));
  const pretes = DATA_ROOM_KINDS.filter((k) => byKind.has(k)).length;

  return (
    <section className="rounded-[1.75rem] border border-line bg-paper p-5 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight text-ink">Documents du cabinet</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        {canDownload
          ? "PDF du cabinet. Aucun nom d’assuré."
          : "Les pièces s’ouvrent après le dépôt de 2,5 % du prix. Le cédant reste sous alias jusque-là. Aucun nom d’assuré."}
      </p>
      {canUpload ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-[14px] ${
            pretes === DATA_ROOM_KINDS.length ? "border-ok/30 bg-ok/5 text-ink" : "border-indigo-line bg-indigo-soft text-ink"
          }`}
        >
          <p className="font-semibold">
            {pretes === DATA_ROOM_KINDS.length ? "✓ Dossier prêt à céder" : `Dossier prêt à céder : ${pretes} pièce${pretes > 1 ? "s" : ""} sur ${DATA_ROOM_KINDS.length}`}
          </p>
          <p className="mt-0.5 text-[13px] text-muted">
            {pretes === DATA_ROOM_KINDS.length
              ? "Dès qu’une offre est retenue, l’acquéreur examine les pièces sans vous attendre."
              : `Déposez maintenant : ${DATA_ROOM_KINDS.filter((k) => !byKind.has(k)).map((k) => companyDocLabel(k)).join(", ")}. La vérification ne vous attendra pas.`}
          </p>
        </div>
      ) : null}
      <ul className="mt-4 divide-y divide-line">
        {COMPANY_DOC_KINDS.map((item) => {
          const doc = byKind.get(item.kind);
          return (
            <li key={item.kind} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-[14px] font-medium text-ink">{item.label}</p>
                <p className="text-[13px] text-muted">
                  {canDownload && doc ? doc.fileName : canDownload ? "Non déposé" : "Verrouillé"}
                </p>
              </div>
              {canDownload && doc ? (
                <a
                  href={`/api/cabinet/${listingId}/${doc.id}`}
                  className="text-[14px] font-medium text-indigo-dark hover:underline"
                >
                  Ouvrir le PDF
                </a>
              ) : (
                <span className="text-[12px] font-medium text-muted">
                  {canDownload ? "—" : "Verrouillé"}
                </span>
              )}
            </li>
          );
        })}
        {docs
          .filter((doc) => !COMPANY_DOC_KINDS.some((item) => item.kind === doc.kind))
          .map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-[14px] font-medium text-ink">{companyDocLabel(doc.kind)}</p>
                <p className="text-[13px] text-muted">{canDownload ? doc.fileName : "Verrouillé"}</p>
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
        accept="application/pdf,.pdf,image/jpeg,image/png,.jpg,.jpeg,.png"
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
