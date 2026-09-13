"use client";

import { useActionState, useRef, useState } from "react";
import {
  answerLoiAction,
  removeDealPieceAction,
  saveDealCarrierCodesAction,
  signDeedAction,
  uploadDealPieceAction,
  type DealProcessState,
} from "@/app/actions/deal-process";
import { Button } from "@/components/ui/button";

const initial: DealProcessState = {};

type Action = (prev: DealProcessState, formData: FormData) => Promise<DealProcessState>;

function Feedback({ state }: { state: DealProcessState }) {
  if (state.error) return <p className="mt-2 text-[13px] font-medium text-danger">{state.error}</p>;
  if (state.ok) return <p className="mt-2 text-[13px] font-medium text-ok">{state.ok}</p>;
  return null;
}

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink focus:border-indigo focus:outline-none";

/**
 * Engagement d'une partie : une case à cocher qui dit précisément à quoi l'on
 * s'engage, puis le bouton. Le bouton reste inactif tant que la case n'est pas
 * cochée : on ne signe pas par mégarde.
 */
export function CommitForm({
  dealId,
  action,
  consentLabel,
  submitLabel,
  pendingLabel = "Enregistrement…",
}: {
  dealId: string;
  action: Action;
  consentLabel: string;
  submitLabel: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [coche, setCoche] = useState(false);
  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="dealId" value={dealId} />
      <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink">
        <input
          type="checkbox"
          name="consent"
          checked={coche}
          onChange={(e) => setCoche(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#2563eb]"
        />
        <span>{consentLabel}</span>
      </label>
      <div>
        <Button type="submit" disabled={pending || !coche}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function PieceUpload({
  dealId,
  slot,
  label = "Déposer",
  replace = false,
}: {
  dealId: string;
  slot: string;
  label?: string;
  replace?: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadDealPieceAction, initial);
  const [nom, setNom] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form action={formAction} className="grid gap-1">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="slot" value={slot} />
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
              {pending ? "Dépôt…" : label}
            </Button>
          </>
        ) : null}
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function RemovePiece({ dealId, documentId }: { dealId: string; documentId: string }) {
  const [state, formAction, pending] = useActionState(removeDealPieceAction, initial);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="documentId" value={documentId} />
      <button type="submit" disabled={pending} className="text-[13px] text-muted underline-offset-2 hover:text-danger hover:underline">
        {pending ? "…" : "Retirer"}
      </button>
      {state.error ? <span className="ml-2 text-[12px] text-danger">{state.error}</span> : null}
    </form>
  );
}

export function LoiProposalForm({
  dealId,
  action,
  defaultPrice,
  defaultDate,
  defaultConditions,
  minDate,
}: {
  dealId: string;
  action: Action;
  defaultPrice: string;
  defaultDate: string;
  defaultConditions: string;
  minDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="dealId" value={dealId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[14px] font-medium text-ink">
          Prix ferme (€)
          <input name="price" inputMode="decimal" required defaultValue={defaultPrice} className={inputClass} />
          <span className="text-[12px] font-normal text-muted">80 % comptant au séquestre, 20 % différé.</span>
        </label>
        <label className="grid gap-1.5 text-[14px] font-medium text-ink">
          Date d’effet du transfert
          <input name="effectiveDate" type="date" required min={minDate} defaultValue={defaultDate} className={inputClass} />
        </label>
      </div>
      <label className="grid gap-1.5 text-[14px] font-medium text-ink">
        Conditions particulières <span className="font-normal text-muted">(facultatif)</span>
        <textarea
          name="conditions"
          rows={3}
          maxLength={1500}
          defaultValue={defaultConditions}
          placeholder="Ex. : reprise de la collaboratrice en charge du portefeuille, accompagnement du cédant pendant trois mois…"
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-[15px] text-ink focus:border-indigo focus:outline-none"
        />
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer la lettre d’intention au cédant"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function LoiAnswerForm({ dealId }: { dealId: string }) {
  const [state, formAction, pending] = useActionState(answerLoiAction, initial);
  const [refus, setRefus] = useState(false);
  const [coche, setCoche] = useState(false);
  return (
    <div className="grid gap-3">
      {!refus ? (
        <form action={formAction} className="grid gap-3">
          <input type="hidden" name="dealId" value={dealId} />
          <input type="hidden" name="decision" value="accept" />
          <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink">
            <input
              type="checkbox"
              name="consent"
              checked={coche}
              onChange={(e) => setCoche(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#2563eb]"
            />
            <span>J’accepte la lettre d’intention : le prix est figé et je m’engage à l’exclusivité de soixante jours.</span>
          </label>
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" disabled={pending || !coche}>
              {pending ? "Enregistrement…" : "Accepter la lettre d’intention"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setRefus(true)}>
              Refuser
            </Button>
          </div>
        </form>
      ) : (
        <form action={formAction} className="grid gap-3">
          <input type="hidden" name="dealId" value={dealId} />
          <input type="hidden" name="decision" value="decline" />
          <label className="grid gap-1.5 text-[14px] font-medium text-ink">
            Motif du refus
            <textarea
              name="reason"
              rows={3}
              required
              minLength={5}
              maxLength={500}
              placeholder="Ex. : le prix ne tient pas compte des commissions précomptées de 2025…"
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-[15px] text-ink focus:border-indigo focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? "Envoi…" : "Envoyer le refus"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRefus(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}
      <Feedback state={state} />
    </div>
  );
}

export function CarrierCodesForm({ dealId, carriers }: { dealId: string; carriers: { name: string; code: string }[] }) {
  const [state, formAction, pending] = useActionState(saveDealCarrierCodesAction, initial);
  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="dealId" value={dealId} />
      <div className="grid gap-2 sm:grid-cols-2">
        {carriers.map((c, i) => (
          <label key={c.name} className="grid gap-1 text-[13px] font-medium text-ink">
            {c.name}
            <input name={`code_${i}`} defaultValue={c.code} placeholder="Code courtier" maxLength={40} className={inputClass} />
          </label>
        ))}
      </div>
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer les codes"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function SignDeedForm({ dealId, representative }: { dealId: string; representative: string | null }) {
  const [state, formAction, pending] = useActionState(signDeedAction, initial);
  const [coche, setCoche] = useState(false);
  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="dealId" value={dealId} />
      <label className="grid max-w-md gap-1.5 text-[14px] font-medium text-ink">
        Nom et prénom du signataire
        <input name="signatureName" required defaultValue="" placeholder={representative ?? "Prénom Nom"} className={inputClass} />
        {representative ? <span className="text-[12px] font-normal text-muted">Représentant au dossier : {representative}</span> : null}
      </label>
      <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink">
        <input
          type="checkbox"
          name="consent"
          checked={coche}
          onChange={(e) => setCoche(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#2563eb]"
        />
        <span>
          Je signe le protocole de cession au nom du cabinet que je représente. Ma signature est horodatée et liée à
          l’empreinte du texte approuvé.
        </span>
      </label>
      <div>
        <Button type="submit" disabled={pending || !coche}>
          {pending ? "Signature…" : "Signer le protocole"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
