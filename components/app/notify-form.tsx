"use client";

import { useActionState } from "react";
import { updateNotifyPrefsAction, type ProfileFormState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import type { NotifyPrefs } from "@/lib/account/notify-prefs";

const initial: ProfileFormState = {};

const OPTIONS: Array<{ key: keyof NotifyPrefs; label: string; hint: string }> = [
  { key: "messages", label: "Messages", hint: "Un acquéreur ou un cédant vous écrit." },
  { key: "offers", label: "Offres", hint: "Fenêtre close, offre retenue ou retirée." },
  { key: "deals", label: "Dossiers", hint: "Avancement NDA, LOI, séquestre, ORIAS." },
  { key: "billing", label: "Facturation", hint: "Abonnement et dépôts d’intérêt." },
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
