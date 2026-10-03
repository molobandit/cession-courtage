"use client";

import { useActionState } from "react";
import { ReadinessChecklist, PaymentMethodChoice, usePaymentMethod, type EngagementReadiness } from "@/components/offer/engagement-readiness";
import { placeInterestDepositAction, type DepositFormState } from "@/app/actions/deposits";
import { Button } from "@/components/ui/button";
import { keepFormSubmit } from "@/components/ui/keep-form";
import { depositTerms } from "@/lib/billing/deposit-fate";

const initial: DepositFormState = {};

/**
 * Pose le depot d'interet de 2,5 %.
 *
 * Le droit est verifie par l'action serveur, ce bouton n'est qu'un declencheur.
 * Les règles disent où part l'argent et que, sans rail actif, rien n'est débité.
 *
 * Les regles du depot sont affichees au-dessus du bouton, pas ailleurs : un
 * engagement dont on decouvre les conditions apres coup n'en est pas un. Les
 * deux issues sont dites, y compris celle qui coute.
 */
export function DepositForm({
  listingId,
  amountLabel,
  amountEur,
  readiness,
}: {
  listingId: string;
  amountLabel: string;
  amountEur?: number;
  readiness: EngagementReadiness;
}) {
  const [state, action, pending] = useActionState(placeInterestDepositAction, initial);
  const [methode, setMethode] = usePaymentMethod();
  const pret = readiness.agreements && readiness.financing.ok;

  return (
    <form onSubmit={keepFormSubmit(action)} className="mt-5 grid gap-4">
      <input type="hidden" name="listingId" value={listingId} />
      <ReadinessChecklist readiness={readiness} />
      <ul className="grid gap-1.5 rounded-xl border border-line bg-surface-alt px-4 py-3 text-[13px] leading-relaxed text-ink">
        {depositTerms(amountLabel, amountEur).map((regle) => (
          <li key={regle}>{regle}</li>
        ))}
      </ul>
      <PaymentMethodChoice value={methode} onChange={setMethode} />
      <div>
        <Button type="submit" variant="primary" disabled={pending || !pret}>
          {pending ? "Enregistrement…" : `Verser mon dépôt de ${amountLabel}`}
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="text-[15px] text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
