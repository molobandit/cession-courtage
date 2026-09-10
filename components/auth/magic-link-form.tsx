"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestMagicLinkAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: FormState = {};

export function MagicLinkForm() {
  const [state, action, pending] = useActionState(requestMagicLinkAction, initial);

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1">
        <Label htmlFor="email">E-mail professionnel</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer le code"}
      </Button>
      <p className="text-sm text-muted">
        <Link href="/connexion" className="underline underline-offset-2">
          Revenir au mot de passe
        </Link>
      </p>
    </form>
  );
}
