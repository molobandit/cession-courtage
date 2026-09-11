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
  "mt-1.5 flex h-11 w-full rounded-xl border border-line bg-surface-alt px-4 text-[15px] text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";
const areaClass =
  "mt-1.5 w-full rounded-xl border border-line bg-surface-alt px-4 py-3 text-[15px] text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";
const fieldsetClass = "grid gap-4 rounded-[1.75rem] border border-line bg-paper p-5 shadow-sm sm:p-7";
const legendClass = "text-[13px] font-medium uppercase tracking-[0.14em] text-indigo-dark";

export function CreateListingForm({
  portfolioId,
  defaultAsking,
  defaultCertify = false,
  qualityDefaults,
}: {
  portfolioId: string;
  defaultAsking: string;
  defaultCertify?: boolean;
  qualityDefaults?: {
    commissionsYear1: string;
    commissionsYear2: string;
    commissionsYear3: string;
    recurrentSharePercent: string;
    managedAnnualPremium: string;
  };
}) {
  const [state, action, pending] = useActionState(createListingAction, initial);
  return (
    <form action={action} className="grid max-w-2xl gap-6">
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Informations générales</legend>
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
          <Input id="askingPrice" name="askingPrice" defaultValue={defaultAsking} required className="mt-1.5 h-11 rounded-xl" />
          <p className="text-[13px] text-muted">Entre 2 000 et 200 000 €. Fourchette possible via la négociation.</p>
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
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Données financières</legend>
        <p className="text-[13px] leading-relaxed text-muted">
          Trois exercices de commissions (montants, pas un pourcentage), la part
          du récurrent, et la prime annuelle gérée — distincte des commissions.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label htmlFor="commissionsYear1">Commissions N-2 (€)</Label>
            <Input
              id="commissionsYear1"
              name="commissionsYear1"
              defaultValue={qualityDefaults?.commissionsYear1}
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="commissionsYear2">Commissions N-1 (€)</Label>
            <Input
              id="commissionsYear2"
              name="commissionsYear2"
              defaultValue={qualityDefaults?.commissionsYear2}
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="commissionsYear3">Dernier exercice (€)</Label>
            <Input
              id="commissionsYear3"
              name="commissionsYear3"
              defaultValue={qualityDefaults?.commissionsYear3}
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="recurrentSharePercent">Part du récurrent (%)</Label>
            <Input
              id="recurrentSharePercent"
              name="recurrentSharePercent"
              defaultValue={qualityDefaults?.recurrentSharePercent}
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="managedAnnualPremium">Prime annuelle gérée (€)</Label>
            <Input
              id="managedAnnualPremium"
              name="managedAnnualPremium"
              defaultValue={qualityDefaults?.managedAnnualPremium}
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
        </div>
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
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Cadre juridique de la cession</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="transferVehicle">Objet de la cession</Label>
            <select id="transferVehicle" name="transferVehicle" className={selectClass} defaultValue="">
              <option value="">Non précisé</option>
              <option value="parts">Cession de parts sociales</option>
              <option value="fonds">Cession de fonds de commerce / portefeuille</option>
              <option value="mixte">Mixte</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="oriasCategories">Catégories ORIAS</Label>
            <Input id="oriasCategories" name="oriasCategories" placeholder="COA, MIA…" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="distribution">Mode de distribution</Label>
            <select id="distribution" name="distribution" className={selectClass} defaultValue="">
              <option value="">Non précisé</option>
              <option value="agence">Agence / bureau</option>
              <option value="distance">Vente à distance</option>
              <option value="mixte">Mixte</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="distanceShare">Part vente à distance</Label>
            <Input id="distanceShare" name="distanceShare" placeholder="ex. 30 %" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="complianceDema">Démarchage téléphonique</Label>
            <select id="complianceDema" name="complianceDema" className={selectClass} defaultValue="">
              <option value="">Non précisé</option>
              <option value="aucun">Aucun démarchage</option>
              <option value="conforme">Activité conforme Bloctel</option>
              <option value="a_regulariser">À régulariser</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rcProInsurer">Assureur RC professionnelle</Label>
            <Input id="rcProInsurer" name="rcProInsurer" placeholder="Compagnie, n° de contrat" />
          </div>
        </div>
      </fieldset>
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Organisation du cabinet</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="employeeCount">Effectif</Label>
            <Input id="employeeCount" name="employeeCount" placeholder="Salariés, mandataires" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="introducersCount">Apporteurs d’affaires</Label>
            <Input id="introducersCount" name="introducersCount" placeholder="Nombre, nature des accords" />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="softwareStack">Logiciels métier</Label>
            <Input id="softwareStack" name="softwareStack" placeholder="CRM, comparateur, GED…" />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="socialCommitments">Engagements sociaux</Label>
            <textarea
              id="socialCommitments"
              name="socialCommitments"
              rows={3}
              className={areaClass}
              placeholder="Clauses de non-concurrence, reprise du personnel, location-gérance…"
            />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="pendingLitigation">Litiges et contentieux</Label>
            <textarea
              id="pendingLitigation"
              name="pendingLitigation"
              rows={3}
              className={areaClass}
              placeholder="Aucun, ou description sans nom de client final"
            />
          </div>
        </div>
      </fieldset>
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Conformité intermédiaire</legend>
        <p className="text-[14px] leading-relaxed text-muted">
          Ces éléments aident l’acquéreur à vérifier l’éligibilité de la reprise
          (DDA, LCB-FT, ORIAS). Aucun nom de client final.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="ddaTraining">Formation DDA</Label>
            <select id="ddaTraining" name="ddaTraining" className={selectClass} defaultValue="">
              <option value="">Non précisé</option>
              <option value="a_jour">Formations à jour</option>
              <option value="en_cours">Plan de rattrapage en cours</option>
              <option value="a_regulariser">À régulariser</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="amlProcedure">Dispositif LCB-FT</Label>
            <select id="amlProcedure" name="amlProcedure" className={selectClass} defaultValue="">
              <option value="">Non précisé</option>
              <option value="formalise">Formalisé</option>
              <option value="en_cours">Mise à jour en cours</option>
              <option value="a_regulariser">À formaliser</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="sellerDependency">Dépendance au cédant</Label>
            <select id="sellerDependency" name="sellerDependency" className={selectClass} defaultValue="">
              <option value="">Non précisé</option>
              <option value="faible">Faible</option>
              <option value="moyenne">Moyenne</option>
              <option value="forte">Forte</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="premisesStatus">Locaux</Label>
            <Input id="premisesStatus" name="premisesStatus" placeholder="Bail, propriété, coworking…" className="mt-1.5 h-11 rounded-xl" />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="exclusiveMandates">Mandats exclusifs / compagnies clés</Label>
            <Input id="exclusiveMandates" name="exclusiveMandates" placeholder="Sans nom de client final" className="mt-1.5 h-11 rounded-xl" />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="stornoShare">Storno / clawback commissions</Label>
            <Input id="stornoShare" name="stornoShare" placeholder="ex. 4 % sur 12 mois" className="mt-1.5 h-11 rounded-xl" />
          </div>
        </div>
      </fieldset>
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Présentation</legend>
        <div className="grid gap-1">
          <Label htmlFor="presentation">Présentez votre portefeuille</Label>
          <textarea
            id="presentation"
            name="presentation"
            rows={7}
            className={areaClass}
            placeholder="Histoire, potentiel, profil des clients, points forts, compagnies, modalités de transmission…"
          />
        </div>
      </fieldset>
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
      <p className="text-[13px] leading-relaxed text-muted">
        Après enregistrement, déposez les PDF du cabinet (Kbis, ORIAS, RC pro, présentation)
        sur la fiche de l’annonce. L’acquéreur les voit après le dépôt de 2,5 % du prix.
      </p>
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
