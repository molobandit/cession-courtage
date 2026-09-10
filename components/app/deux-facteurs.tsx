"use client";

import { useActionState, useState } from "react";
import {
  activerDeuxFacteursAction,
  desactiverDeuxFacteursAction,
  preparerDeuxFacteursAction,
  type DeuxFacteursState,
} from "@/app/actions/two-factor";
import { Button } from "@/components/ui/button";

const initial: DeuxFacteursState = {};

/**
 * Activation du second facteur.
 *
 * Trois temps volontairement separes : obtenir la cle, prouver qu'on l'a bien
 * enregistree, puis recevoir les codes de secours. Activer sans preuve
 * fermerait le compte de quiconque aurait mal recopie la cle.
 */
export function DeuxFacteurs({ actif, codesRestants }: { actif: boolean; codesRestants: number }) {
  const [prep, setPrep] = useState<DeuxFacteursState | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [activation, activer, activationEnCours] = useActionState(activerDeuxFacteursAction, initial);
  const [desactivation, desactiver, desactivationEnCours] = useActionState(
    desactiverDeuxFacteursAction,
    initial,
  );

  // Les codes de secours ne sont lisibles qu'ici, une seule fois : ils sont
  // haches en base et personne, nous compris, ne pourra les relire.
  if (activation.codesDeSecours) {
    return (
      <div className="mt-4 rounded-2xl border border-indigo-line bg-indigo-soft p-5">
        <p className="text-[15px] font-semibold text-ink">
          Second facteur activé. Notez ces codes de secours maintenant.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Ils remplacent votre téléphone s’il est perdu, et ne seront plus jamais
          affichés. Chacun ne sert qu’une fois.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {activation.codesDeSecours.map((code) => (
            <li key={code} className="tabular rounded-xl bg-surface px-3 py-2 text-center text-[15px] font-medium text-ink">
              {code}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (actif || activation.active) {
    return (
      <div className="mt-4">
        <p className="text-[15px] text-ink">
          Second facteur actif.{" "}
          <span className="text-muted">
            {codesRestants} code{codesRestants > 1 ? "s" : ""} de secours restant
            {codesRestants > 1 ? "s" : ""}.
          </span>
        </p>
        <form action={desactiver} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="mdp-2fa" className="block text-[14px] text-muted">
              Mot de passe, pour désactiver
            </label>
            <input
              id="mdp-2fa"
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 h-11 rounded-full border border-line bg-surface px-4 text-[15px] text-ink"
            />
          </div>
          <Button type="submit" variant="outline" disabled={desactivationEnCours}>
            {desactivationEnCours ? "Désactivation…" : "Désactiver"}
          </Button>
        </form>
        {desactivation.error ? (
          <p role="alert" className="mt-3 text-[15px] text-danger">
            {desactivation.error}
          </p>
        ) : null}
      </div>
    );
  }

  if (!prep?.secret) {
    return (
      <div className="mt-4">
        <Button
          type="button"
          variant="primary"
          disabled={enCours}
          onClick={async () => {
            setEnCours(true);
            setPrep(await preparerDeuxFacteursAction());
            setEnCours(false);
          }}
        >
          {enCours ? "Préparation…" : "Activer le second facteur"}
        </Button>
        {prep?.error ? (
          <p role="alert" className="mt-3 text-[15px] text-danger">
            {prep.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
      <p className="text-[15px] leading-relaxed text-muted">
        Dans votre application d’authentification, ajoutez un compte en saisissant
        cette clé :
      </p>
      <p className="tabular mt-3 break-all rounded-xl bg-surface-alt px-4 py-3 text-[16px] font-semibold text-ink">
        {prep.secret}
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Compte : votre adresse. Type : basé sur le temps. Six chiffres, trente
        secondes.
      </p>
      <form action={activer} className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="code-2fa" className="block text-[14px] text-muted">
            Code affiché par l’application
          </label>
          <input
            id="code-2fa"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="tabular mt-1 h-11 w-40 rounded-full border border-line bg-surface px-4 text-[15px] text-ink"
          />
        </div>
        <Button type="submit" disabled={activationEnCours}>
          {activationEnCours ? "Vérification…" : "Confirmer"}
        </Button>
      </form>
      {activation.error ? (
        <p role="alert" className="mt-3 text-[15px] text-danger">
          {activation.error}
        </p>
      ) : null}
    </div>
  );
}
