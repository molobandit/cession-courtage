"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
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
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-sm text-muted">
        <Link href="/connexion/lien-magique" className="underline underline-offset-2">
          Recevoir un lien magique
        </Link>
        {" · "}
        <Link href="/inscription" className="underline underline-offset-2">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
