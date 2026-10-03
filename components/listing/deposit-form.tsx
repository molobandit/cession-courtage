"use client";

import { useActionState, useState } from "react";
import { ReadinessChecklist, PaymentMethodChoice, usePaymentMethod, type EngagementReadiness } from "@/components/offer/engagement-readiness";
import { placeInterestDepositAction, type DepositFormState } from "@/app/actions/deposits";
import { Button } from "@/components/ui/button";
import { keepFormSubmit } from "@/components/ui/keep-form";
import { depositTerms } from "@/lib/billing/deposit-fate";
import { DEPOSIT_CONSEQUENCES } from "@/lib/copy/market";

const initial: DepositFormState = {};

/**
 * Verse le dépôt de positionnement de 2,5 %.
 *
 * Un dépôt ne se verse jamais en un clic : le bouton ouvre d'abord un
 * récapitulatif qui redit le montant de l'annonce, le dépôt, ce que le
 * versement déclenche, et demande d'accepter l'engagement de confidentialité.
 * Le droit est vérifié par l'action serveur ; cet écran n'est qu'un garde-fou
 * pour celui qui s'engage.
 *
 * `rappelPrerequis` reste à faux quand l'écran dit déjà, au-dessus, ce qu'il
 * faut avoir signé et justifié : le lire deux fois ne l'apprend pas mieux.
 */
export function DepositForm({
  listingId,
  publicNumber,
  amountLabel,
  amountEur,
  listingAmountLabel,
  readiness,
  rappelPrerequis = true,
}: {
  listingId: string;
  publicNumber?: number;
  amountLabel: string;
  amountEur?: number;
  listingAmountLabel: string;
  readiness: EngagementReadiness;
  rappelPrerequis?: boolean;
}) {
  const [state, action, pending] = useActionState(placeInterestDepositAction, initial);
  const [methode, setMethode] = usePaymentMethod();
  const [recapitulatif, setRecapitulatif] = useState(false);
  const [accepte, setAccepte] = useState(false);
  const pret = readiness.agreements && readiness.financing.ok;

  return (
    <form onSubmit={keepFormSubmit(action)} className="mt-5 grid gap-4">
      <input type="hidden" name="listingId" value={listingId} />
      {rappelPrerequis ? <ReadinessChecklist readiness={readiness} /> : null}
      <ul className="grid gap-1.5 rounded-xl border border-line bg-surface-alt px-4 py-3 text-[13px] leading-relaxed text-ink">
        {depositTerms(amountLabel, amountEur).map((regle) => (
          <li key={regle}>{regle}</li>
        ))}
      </ul>
      <PaymentMethodChoice value={methode} onChange={setMethode} />

      {recapitulatif ? (
        <div className="rounded-2xl border border-indigo-line bg-indigo-soft p-5">
          <p className="text-[17px] font-semibold text-ink">Confirmer votre positionnement</p>
          {publicNumber ? (
            <p className="mt-1 text-[13px] text-muted">Dossier n° {publicNumber}</p>
          ) : null}
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                Montant de l’annonce
              </dt>
              <dd className="tabular mt-1 text-[20px] font-bold text-ink">{listingAmountLabel}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                Dépôt à verser
              </dt>
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
          <label className="mt-4 flex items-start gap-2.5 text-[14px] text-ink">
            <input
              type="checkbox"
              checked={accepte}
              onChange={(e) => setAccepte(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-line"
            />
            J’ai lu et j’accepte l’engagement de confidentialité.
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={pending || !pret || !accepte}>
              {pending ? "Enregistrement…" : `Confirmer et verser ${amountLabel}`}
            </Button>
            <Button type="button" variant="outline" onClick={() => setRecapitulatif(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button type="button" variant="primary" disabled={!pret} onClick={() => setRecapitulatif(true)}>
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
