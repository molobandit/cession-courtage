"use client";

import { useActionState } from "react";
import { changePasswordAction, type ProfileFormState } from "@/app/actions/profile";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";

const initial: ProfileFormState = {};
const field =
  "h-11 rounded-xl border-line bg-surface-alt px-4 text-[15px] focus-visible:border-indigo focus-visible:ring-indigo";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="grid max-w-lg gap-4">
      <div>
        <label htmlFor="currentPassword" className="text-[13px] font-medium text-ink">
          Mot de passe actuel
        </label>
        <PasswordField
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          required
          className={`mt-1.5 ${field}`}
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="text-[13px] font-medium text-ink">
          Nouveau mot de passe
        </label>
        <PasswordField
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          required
          className={`mt-1.5 ${field}`}
        />
        <p className="mt-1 text-[12px] text-muted">Au moins 10 caractères, une lettre et un chiffre.</p>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="text-[13px] font-medium text-ink">
          Confirmation
        </label>
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          className={`mt-1.5 ${field}`}
        />
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-ok">Mot de passe mis à jour.</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Enregistrement…" : "Changer le mot de passe"}
      </Button>
    </form>
  );
}
