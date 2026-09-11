"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerInvestorAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/auth/password-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: FormState = {};

export function InvestorRegisterForm() {
  const [state, action, pending] = useActionState(registerInvestorAction, initial);

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" name="firstName" autoComplete="given-name" required />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" name="lastName" autoComplete="family-name" required />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" required />
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="password">Mot de passe</Label>
        <PasswordField id="password" name="password" autoComplete="new-password" required />
        <p className="text-xs text-muted">10 caractères minimum, dont une lettre et un chiffre.</p>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="confirmPassword">Confirmation</Label>
        <PasswordField id="confirmPassword" name="confirmPassword" autoComplete="new-password" required />
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création du compte…" : "Créer mon accès investisseur"}
      </Button>
      <p className="text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion?next=/app/mes-dossiers" className="underline underline-offset-2">
          Connexion
        </Link>
      </p>
    </form>
  );
}
