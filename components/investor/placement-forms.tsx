"use client";

import { useActionState, useState } from "react";
import { placeInvestorDepositAction, type InvestorFormState } from "@/app/actions/investor-positions";
import { PaymentMethodChoice, usePaymentMethod } from "@/components/offer/engagement-readiness";
import { Button } from "@/components/ui/button";
import { keepFormSubmit } from "@/components/ui/keep-form";
import { depositTerms } from "@/lib/billing/deposit-fate";
import { DEPOSIT_CONSEQUENCES } from "@/lib/copy/market";

const initial: InvestorFormState = {};

/**
 * Dépôt de positionnement d'un investisseur.
 *
 * Même parcours que l'acquéreur, parce que le dossier investisseurs applique
 * la même règle : 2,5 % du montant de l'annonce versés dans un trust, et c'est
 * ce dépôt qui lance la procédure et lève l'anonymat du cédant. Le bouton
 * ouvre donc un récapitulatif avant tout paiement, jamais un versement en un
 * clic, et le moyen de paiement se choisit comme ailleurs.
 */
export function InvestorDepositForm({
  listingId,
  publicNumber,
  amountLabel,
  amountEur,
  listingAmountLabel,
}: {
  listingId: string;
  publicNumber?: number | null;
  amountLabel: string;
  amountEur?: number;
  listingAmountLabel?: string;
}) {
  const [state, action, pending] = useActionState(placeInvestorDepositAction, initial);
  const [methode, setMethode] = usePaymentMethod();
  const [recapitulatif, setRecapitulatif] = useState(false);

  return (
    <form onSubmit={keepFormSubmit(action)} className="mt-5 grid gap-4">
      <input type="hidden" name="listingId" value={listingId} />
      <ul className="grid gap-1.5 rounded-xl border border-line bg-surface-alt px-4 py-3 text-[13px] leading-relaxed text-ink">
        {depositTerms(amountLabel, amountEur).map((regle) => (
          <li key={regle}>{regle}</li>
        ))}
      </ul>
      <PaymentMethodChoice value={methode} onChange={setMethode} />

      {recapitulatif ? (
        <div className="rounded-2xl border border-indigo-line bg-indigo-soft p-5">
          <p className="text-[17px] font-semibold text-ink">Confirmer votre positionnement</p>
          {publicNumber ? <p className="mt-1 text-[13px] text-muted">Dossier n° {publicNumber}</p> : null}
          <dl className="mt-4 grid grid-cols-2 gap-4">
            {listingAmountLabel ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Montant de l’annonce
                </dt>
                <dd className="tabular mt-1 text-[20px] font-bold text-ink">{listingAmountLabel}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Dépôt à verser</dt>
              <dd className="tabular mt-1 text-[20px] font-bold text-indigo-dark">{amountLabel}</dd>
            </div>
          </dl>
          <ol className="mt-4 grid gap-1 rounded-xl border border-indigo-line bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink">
            {DEPOSIT_CONSEQUENCES.map((suite, index) => (
              <li key={suite}>
                {index + 1}. {suite}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Enregistrement…" : `Confirmer et verser ${amountLabel}`}
            </Button>
            <Button type="button" variant="outline" onClick={() => setRecapitulatif(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button type="button" variant="primary" onClick={() => setRecapitulatif(true)}>
            Verser le dépôt de positionnement
          </Button>
        </div>
      )}

      {state.error ? (
        <p role="alert" className="text-[15px] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
