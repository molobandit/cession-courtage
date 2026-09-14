"use client";

import { useActionState, useState } from "react";
import { signAgreementsAction, type AgreementsState } from "@/app/actions/agreements";
import { Button } from "@/components/ui/button";
import { keepFormSubmit } from "@/components/ui/keep-form";

const initial: AgreementsState = {};

export function AgreementsSignForm({ representative, next }: { representative: string | null; next: string | null }) {
  const [state, action, pending] = useActionState(signAgreementsAction, initial);
  const [coche, setCoche] = useState(false);
  if (state.ok) {
    return (
      <div className="rounded-2xl border border-ok/30 bg-ok/5 px-4 py-3 text-[15px] text-ink">
        <p className="font-semibold text-ok">✓ {state.ok}</p>
        {next ? (
          <a href={next} className="mt-2 inline-flex h-10 items-center rounded-full bg-indigo px-4 text-[14px] font-semibold !text-white hover:bg-indigo-dark">
            Reprendre là où j’en étais
          </a>
        ) : null}
      </div>
    );
  }
  return (
    <form onSubmit={keepFormSubmit(action)} className="grid gap-3">
      <label className="grid max-w-md gap-1.5 text-[14px] font-medium text-ink">
        Nom et prénom du signataire
        <input
          name="signatureName"
          required
          placeholder={representative ?? "Prénom Nom"}
          className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink focus:border-indigo focus:outline-none"
        />
      </label>
      <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink">
        <input type="checkbox" name="consent" checked={coche} onChange={(e) => setCoche(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#2563eb]" />
        <span>
          J’ai lu l’engagement de confidentialité et le contrat d’intermédiation, et je les signe au nom de mon cabinet pour
          la durée de mon immatriculation ORIAS.
        </span>
      </label>
      <div>
        <Button type="submit" disabled={pending || !coche}>
          {pending ? "Signature…" : "Signer mes engagements"}
        </Button>
      </div>
      {state.error ? <p className="text-[13px] font-medium text-danger">{state.error}</p> : null}
    </form>
  );
}
