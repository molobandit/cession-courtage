"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/auth/password-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: FormState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="next" value={nextPath} />
      <div className="grid gap-1">
        <Label htmlFor="email">E-mail professionnel</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="password">Mot de passe</Label>
        <PasswordField id="password" name="password" autoComplete="current-password" required />
      </div>
      {state.besoinDeCode ? (
        <div className="grid gap-1 rounded-2xl border border-indigo-line bg-indigo-soft p-4">
          <Label htmlFor="totp">Code de vérification</Label>
          <Input
            id="totp"
            name="totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="000000"
            required
          />
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Les six chiffres affichés par votre application d’authentification. Un
            code de secours convient également.
          </p>
        </div>
      ) : null}
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Connexion…" : state.besoinDeCode ? "Valider le code" : "Se connecter"}
      </Button>
      <p className="text-sm text-muted">
        <Link href="/connexion/lien-magique" className="underline underline-offset-2">
          Recevoir un code par e-mail
        </Link>
        {" · "}
        <Link href={nextPath.startsWith("/app/mandats") ? "/inscription?voie=acheter" : "/inscription"} className="underline underline-offset-2">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
