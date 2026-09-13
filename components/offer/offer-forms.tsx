"use client";

import { useActionState, useState } from "react";
import { acceptOfferAction, submitOfferAction, withdrawOfferAction, type OfferFormState } from "@/app/actions/offers";
import { Button } from "@/components/ui/button";
import { keepFormSubmit } from "@/components/ui/keep-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LotPicker } from "@/components/offer/lot-picker";
import type { CarrierLot } from "@/lib/listing/lots";

const initial: OfferFormState = {};

export function SubmitOfferForm({
  listingId,
  asking,
  lots = [],
  availableCarriers = [],
  depositLabel,
  depositTermsLines = [],
  needsDeposit = false,
  needsNda = false,
}: {
  listingId: string;
  asking: string;
  /** Lots du portefeuille, pour proposer une reprise partielle. */
  lots?: CarrierLot[];
  availableCarriers?: string[];
  /** Montant du dépôt, affiché quand l'offre le pose en même temps. */
  depositLabel?: string;
  depositTermsLines?: string[];
  /** L'acquéreur n'a pas encore déposé : l'offre pose le dépôt en même temps. */
  needsDeposit?: boolean;
  /** Confidentialité pas encore acceptée. */
  needsNda?: boolean;
}) {
  const [state, action, pending] = useActionState(submitOfferAction, initial);
  const [engagement, setEngagement] = useState(!needsDeposit);
  const [nda, setNda] = useState(!needsNda);
  const dansDeuxMois = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 2, 1)).toISOString().slice(0, 10);
  const demain = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return (
    <form onSubmit={keepFormSubmit(action)} className="grid gap-4">
      <input type="hidden" name="listingId" value={listingId} />
      <LotPicker
        lots={lots}
        available={availableCarriers}
        askingPrice={Number(asking)}
        amountFieldId="amount"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="amount">Votre prix (€)</Label>
          <Input id="amount" name="amount" defaultValue={asking} inputMode="decimal" required />
          <p className="text-[12px] text-muted">80 % comptant au séquestre, 20 % après la conservation à douze mois.</p>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="effectiveDate">Date d’effet souhaitée</Label>
          <Input id="effectiveDate" name="effectiveDate" type="date" min={demain} defaultValue={dansDeuxMois} />
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="message">Message au cédant (facultatif)</Label>
        <textarea
          id="message"
          name="message"
          rows={2}
          maxLength={2000}
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-[15px]"
          placeholder="Vos conditions ou questions (pas de numéro de portable)"
        />
      </div>
      {needsDeposit || needsNda ? (
        <div className="grid gap-2.5 rounded-xl border border-line bg-surface-alt px-4 py-3">
          {needsDeposit ? (
            <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink">
              <input type="checkbox" name="engagement" checked={engagement} onChange={(e) => setEngagement(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#2563eb]" />
              <span>
                Je dépose l’engagement de {depositLabel}. Il vient en déduction du prix si la cession aboutit, et reste acquis au
                cédant si je me retire.
                {depositTermsLines.length ? (
                  <span className="mt-1 block text-[12px] text-muted">{depositTermsLines.join(" ")}</span>
                ) : null}
              </span>
            </label>
          ) : null}
          {needsNda ? (
            <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink">
              <input type="checkbox" name="nda" checked={nda} onChange={(e) => setNda(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#2563eb]" />
              <span>
                J’accepte l’engagement de confidentialité : les informations du cabinet ne servent qu’à cette acquisition et
                je ne démarche aucun de ses clients.{" "}
                <a href="/confidentialite-cession" target="_blank" className="text-indigo-dark underline-offset-2 hover:underline">
                  Lire l’engagement
                </a>
              </span>
            </label>
          ) : null}
        </div>
      ) : null}
      <p className="text-[13px] text-muted">Retenue par le cédant, votre offre vaut lettre d’intention : le dossier de cession s’ouvre aussitôt.</p>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending || !engagement || !nda}>
        {pending ? "Envoi…" : needsDeposit ? `Déposer mon offre et mon engagement` : "Déposer mon offre"}
      </Button>
    </form>
  );
}

export function WithdrawOfferButton({ offerId }: { offerId: string }) {
  const [state, action, pending] = useActionState(withdrawOfferAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="offerId" value={offerId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Retrait…" : "Retirer"}
      </Button>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

export function AcceptOfferButton({ offerId }: { offerId: string }) {
  const [state, action, pending] = useActionState(acceptOfferAction, initial);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Retenir cette offre ouvre le dossier de cession : elle vaut lettre d’intention, vous acceptez l’engagement de confidentialité, et les offres concurrentes sur le même lot sont écartées. Continuer ?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="nda" value="on" />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Ouverture du dossier…" : "Retenir cette offre"}
      </Button>
      {state.error ? <p className="mt-2 text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
