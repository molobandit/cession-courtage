"use client";

import { useActionState } from "react";
import {
  createListingAction,
  openOfferWindowAction,
  publishListingAction,
  withdrawListingAction,
  type ListingFormState,
} from "@/app/actions/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VERIFIED_FEE_RANGE_LABEL } from "@/lib/billing/rates";

const initial: ListingFormState = {};
const selectClass =
  "flex h-9 w-full rounded-sm border border-line bg-paper px-2.5 text-sm text-ink outline-none focus:border-navy focus:ring-1 focus:ring-navy";

export function CreateListingForm({
  portfolioId,
  defaultAsking,
  defaultCertify = false,
}: {
  portfolioId: string;
  defaultAsking: string;
  defaultCertify?: boolean;
}) {
  const [state, action, pending] = useActionState(createListingAction, initial);
  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <fieldset className="grid gap-3">
        <legend className="text-[13px] font-semibold uppercase tracking-[0.08em] text-indigo">
          Informations générales
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="portfolioKind">Type de portefeuille</Label>
            <select id="portfolioKind" name="portfolioKind" className={selectClass} defaultValue="Mixte">
              <option value="IARD">IARD</option>
              <option value="Vie">Vie / prévoyance</option>
              <option value="Mixte">Mixte</option>
              <option value="Spécialisé">Spécialisé</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="branchActivity">Branche principale</Label>
            <Input id="branchActivity" name="branchActivity" placeholder="Santé, auto, IARD…" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="desiredCessionDate">Date de cession souhaitée</Label>
            <Input id="desiredCessionDate" name="desiredCessionDate" placeholder="2026, T2 2027…" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="cessionMotive">Motif de la cession</Label>
            <select id="cessionMotive" name="cessionMotive" className={selectClass} defaultValue="">
              <option value="">Non précisé</option>
              <option value="retraite">Départ à la retraite</option>
              <option value="recentrage">Recentrage d’activité</option>
              <option value="cession_partielle">Cession partielle</option>
              <option value="transmission">Transmission</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="askingPrice">Prix demandé (€)</Label>
          <Input id="askingPrice" name="askingPrice" defaultValue={defaultAsking} required />
          <p className="text-xs text-muted">Entre 2 000 et 200 000 €. Fourchette possible via la négociation.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="negotiable">Négociable</Label>
            <select id="negotiable" name="negotiable" className={selectClass} defaultValue="yes">
              <option value="yes">Oui</option>
              <option value="no">Non</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="sellerSupportMonths">Accompagnement</Label>
            <select id="sellerSupportMonths" name="sellerSupportMonths" defaultValue="3" className={selectClass}>
              <option value="0">Aucun (malus valorisation)</option>
              <option value="3">3 mois</option>
              <option value="6">6 mois ou plus</option>
            </select>
          </div>
        </div>
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="text-[13px] font-semibold uppercase tracking-[0.08em] text-indigo">
          Données financières
        </legend>
        <p className="text-[13px] leading-relaxed text-muted">
          Les commissions, le nombre de clients et les compagnies viennent du
          bordereau importé. Le précompte n’apparaît pas sur la fiche publique.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="precompte">Précompte</Label>
            <select id="precompte" name="precompte" className={selectClass} defaultValue="">
              <option value="">Non renseigné</option>
              <option value="yes">Oui</option>
              <option value="no">Non</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="precompteAmount">Montant du précompte</Label>
            <Input id="precompteAmount" name="precompteAmount" placeholder="Si applicable" />
          </div>
        </div>
      </fieldset>
      <div className="grid gap-1">
        <Label htmlFor="presentation">Présentez votre portefeuille</Label>
        <textarea
          id="presentation"
          name="presentation"
          rows={7}
          className="w-full rounded-md border border-line bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo"
          placeholder="Histoire, potentiel, profil des clients, points forts, compagnies, modalités de transmission…"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="certificationRequested"
          defaultChecked={defaultCertify}
          className="mt-1"
        />
        <span>
          Faire certifier mon portefeuille ({VERIFIED_FEE_RANGE_LABEL} si la vente
          aboutit, vérification de la société et des pièces). Sinon l’annonce
          reste simple, sans commission, avec séquestre.
        </span>
      </label>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Enregistrer le brouillon"}
      </Button>
    </form>
  );
}

function TinyForm({
  action,
  listingId,
  label,
  pendingLabel,
  variant = "default",
}: {
  action: (prev: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  listingId: string;
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline";
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="listingId" value={listingId} />
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
      {state.error ? <p className="mt-1 text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

export function PublishListingButton({ listingId }: { listingId: string }) {
  return <TinyForm action={publishListingAction} listingId={listingId} label="Publier" pendingLabel="Publication…" />;
}

export function OpenOffersButton({ listingId }: { listingId: string }) {
  return (
    <TinyForm
      action={openOfferWindowAction}
      listingId={listingId}
      label="Ouvrir les offres (21 jours)"
      pendingLabel="Ouverture…"
    />
  );
}

export function WithdrawListingButton({ listingId }: { listingId: string }) {
  return (
    <TinyForm
      action={withdrawListingAction}
      listingId={listingId}
      label="Retirer"
      pendingLabel="Retrait…"
      variant="outline"
    />
  );
}
