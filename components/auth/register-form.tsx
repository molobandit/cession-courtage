"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/auth/password-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_TYPES, LEGAL_FORMS } from "@/lib/validations/auth";

const initial: FormState = {};
const selectClass =
  "flex h-9 w-full rounded-md border border-line bg-paper px-2.5 text-sm text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";

export function RegisterForm({ defaultRole = "SELLER" }: { defaultRole?: "SELLER" | "BUYER" | "BOTH" }) {
  const [state, action, pending] = useActionState(registerAction, initial);

  return (
    <form action={action} className="grid gap-5">
      <fieldset className="grid gap-3">
        <legend className="text-[13px] font-semibold uppercase tracking-[0.08em] text-indigo">
          Dirigeant
        </legend>
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
        <div className="grid gap-1">
          <Label htmlFor="jobTitle">Fonction</Label>
          <Input id="jobTitle" name="jobTitle" autoComplete="organization-title" placeholder="Gérant, directeur…" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="email">E-mail professionnel</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" required />
          </div>
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-[13px] font-semibold uppercase tracking-[0.08em] text-indigo">
          Société
        </legend>
        <div className="grid gap-1">
          <Label htmlFor="legalName">Nom de la société</Label>
          <Input id="legalName" name="legalName" autoComplete="organization" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="legalForm">Forme juridique</Label>
            <select id="legalForm" name="legalForm" required defaultValue="SAS" className={selectClass}>
              {LEGAL_FORMS.map((form) => (
                <option key={form} value={form}>
                  {form}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="activityType">Type d’activité</Label>
            <select id="activityType" name="activityType" required defaultValue="Courtage mixte" className={selectClass}>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" name="address" autoComplete="street-address" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="postalCode">Code postal</Label>
            <Input
              id="postalCode"
              name="postalCode"
              inputMode="numeric"
              minLength={5}
              maxLength={5}
              pattern="\d{5}"
              required
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" name="city" autoComplete="address-level2" required />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="siren">SIREN ou SIRET</Label>
            <Input id="siren" name="siren" inputMode="numeric" required />
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
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="foundedYear">Année de création</Label>
            <Input id="foundedYear" name="foundedYear" inputMode="numeric" placeholder="2012" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="website">Site internet</Label>
            <Input id="website" name="website" placeholder="https://" />
          </div>
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-[13px] font-semibold uppercase tracking-[0.08em] text-indigo">
          Accès
        </legend>
        <div className="grid gap-1">
          <Label htmlFor="role">Vous souhaitez</Label>
          <select id="role" name="role" required defaultValue={defaultRole} className={selectClass}>
            <option value="SELLER">Céder un portefeuille</option>
            <option value="BUYER">Acquérir un portefeuille</option>
            <option value="BOTH">Les deux</option>
          </select>
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
      </fieldset>

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
