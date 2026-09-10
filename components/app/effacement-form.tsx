"use client";

import { useActionState } from "react";
import { effacerMonCompteAction, type EffacementState } from "@/app/actions/rgpd";
import { Button } from "@/components/ui/button";

const initial: EffacementState = {};

/**
 * Demande d'effacement du compte.
 *
 * La confirmation par saisie est volontaire : un compte ne se supprime pas d'un
 * clic distrait. Le texte annonce clairement ce qui subsiste, car promettre un
 * effacement total serait faux et le dire apres coup serait pire.
 */
export function EffacementForm() {
  const [state, action, pending] = useActionState(effacerMonCompteAction, initial);

  if (state.done) {
    return (
      <div className="mt-4 rounded-2xl border border-line bg-surface-alt p-4">
        <p className="text-[15px] font-medium text-ink">Votre compte est fermé.</p>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Votre identité a été retirée : nom, e-mail, téléphone et numéro ORIAS ne
          figurent plus en base, et aucune connexion n’est plus possible. Les
          pièces contractuelles de vos dossiers clos subsistent sans vous
          désigner, comme la loi l’impose.{" "}
          <form action="/api/deconnexion" method="post" className="mt-3 inline">
            <button type="submit" className="font-medium text-indigo-dark">
              Fermer la session
            </button>
          </form>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-4">
      <label htmlFor="confirmation" className="block text-[14px] text-muted">
        Pour confirmer, saisissez <span className="font-semibold text-ink">SUPPRIMER</span>
      </label>
      <div className="mt-2 flex flex-wrap items-start gap-3">
        <input
          id="confirmation"
          name="confirmation"
          type="text"
          autoComplete="off"
          className="h-11 rounded-full border border-line bg-surface px-4 text-[15px] text-ink"
          placeholder="SUPPRIMER"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Traitement…" : "Supprimer mon compte"}
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="mt-3 max-w-2xl text-[15px] leading-relaxed text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
