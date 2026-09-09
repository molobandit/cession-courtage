"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: FormState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1">
        <Label htmlFor="fullName">Nom professionnel</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="phone">Téléphone (optionnel)</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="oriasNumber">Numéro ORIAS (8 chiffres)</Label>
        <Input
          id="oriasNumber"
          name="oriasNumber"
          inputMode="numeric"
          minLength={8}
          maxLength={8}
          pattern="\d{8}"
          required
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="role">Vous souhaitez</Label>
        <select
          id="role"
          name="role"
          required
          defaultValue="SELLER"
          className="flex h-9 w-full rounded-sm border border-line bg-paper px-2.5 text-sm text-ink outline-none focus:border-navy focus:ring-1 focus:ring-navy"
        >
          <option value="SELLER">Céder un portefeuille</option>
          <option value="BUYER">Acquérir un portefeuille</option>
          <option value="BOTH">Les deux</option>
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <p className="text-xs text-muted">10 caractères minimum, dont une lettre et un chiffre.</p>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="confirmPassword">Confirmation</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création du compte…" : "Créer le compte"}
      </Button>
      <p className="text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="underline underline-offset-2">
          Connexion
        </Link>
      </p>
    </form>
  );
}
