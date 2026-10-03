"use client";

import { useActionState } from "react";
import { updateNotifyPrefsAction, type ProfileFormState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import type { NotifyPrefs } from "@/lib/account/notify-prefs";

const initial: ProfileFormState = {};

/*
 * Quatre alertes, celles du modèle. Les clés « offers » et « billing »
 * restent en base pour les comptes déjà enregistrés, mais ne se règlent plus
 * ici : il n'y a ni offre ni abonnement.
 */
const OPTIONS: Array<{ key: keyof NotifyPrefs; label: string; hint: string }> = [
  { key: "messages", label: "Messages", hint: "Un acquéreur ou un cédant vous écrit." },
  { key: "offers", label: "Dépôt de positionnement reçu", hint: "Un acquéreur verse son dépôt sur l’un de vos dossiers." },
  { key: "deals", label: "Avancement du dossier", hint: "Chaque étape franchie, de l’étude à la signature." },
  { key: "billing", label: "Fonds libérés par le trust", hint: "Le trust libère les fonds après contrôle." },
];

export function NotifyForm({ prefs }: { prefs: NotifyPrefs }) {
  const [state, action, pending] = useActionState(updateNotifyPrefsAction, initial);
  return (
    <form action={action} className="grid gap-4">
      <ul className="grid gap-3">
        {OPTIONS.map((item) => (
          <li key={item.key} className="flex items-start gap-3 rounded-2xl bg-surface-alt px-4 py-3">
            <input
              id={item.key}
              name={item.key}
              type="checkbox"
              defaultChecked={prefs[item.key]}
              className="mt-1 h-4 w-4"
            />
            <label htmlFor={item.key} className="min-w-0">
              <span className="block text-[15px] font-medium text-ink">{item.label}</span>
              <span className="mt-0.5 block text-[13px] text-muted">{item.hint}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-muted">
        Les alertes partent par e-mail. Aucun SMS n’est envoyé sur cette démo.
      </p>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-ok">Préférences enregistrées.</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Enregistrement…" : "Enregistrer les alertes"}
      </Button>
    </form>
  );
}
