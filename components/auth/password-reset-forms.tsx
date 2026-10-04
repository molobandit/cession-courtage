"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, resetPasswordAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: FormState = {};

/** Demande d'un lien de réinitialisation. */
export function PasswordResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1">
        <Label htmlFor="email">E-mail professionnel</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir le lien"}
      </Button>
      <p className="text-[14px] text-muted">
        <Link href="/connexion" className="underline underline-offset-2">
          Revenir à la connexion
        </Link>
      </p>
    </form>
  );
}

/** Choix du nouveau mot de passe, avec le jeton reçu par e-mail. */
export function PasswordResetForm({ email, token }: { email: string; token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-1">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="confirmPassword">Confirmation</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Choisir ce mot de passe"}
      </Button>
    </form>
  );
}
