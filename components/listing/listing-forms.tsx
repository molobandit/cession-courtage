"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createListingAction,
  updateListingAction,
  publishListingAction,
  withdrawListingAction,
  type ListingFormState,
} from "@/app/actions/listings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CERTIFIED_FEE_LINE, PRICE_RULE } from "@/lib/copy/market";

/**
 * Enregistrement automatique du brouillon, dans le navigateur.
 *
 * Un formulaire de cette longueur ne se remplit pas d'une traite. Les
 * réponses sont conservées sur le poste du cédant et remises en place au
 * retour ; l'heure du dernier enregistrement est affichée pour qu'il sache
 * qu'il peut partir sans rien perdre.
 */
function useBrouillonLocal(formulaire: React.RefObject<HTMLFormElement | null>, cle: string) {
  const [enregistreA, setEnregistreA] = useState<string | null>(null);

  useEffect(() => {
    const element = formulaire.current;
    if (!element) return;
    const stockage = `brouillon-annonce:${cle}`;

    try {
      const garde = window.localStorage.getItem(stockage);
      if (garde) {
        const valeurs = JSON.parse(garde) as Record<string, string>;
        for (const [nom, valeur] of Object.entries(valeurs)) {
          const champ = element.elements.namedItem(nom);
          if (champ instanceof HTMLInputElement && champ.type !== "checkbox") champ.value = valeur;
          if (champ instanceof HTMLTextAreaElement || champ instanceof HTMLSelectElement) champ.value = valeur;
        }
      }
    } catch {
      // Un stockage indisponible ne doit jamais empêcher de remplir le formulaire.
    }

    let minuteur: ReturnType<typeof setTimeout> | null = null;
    const enregistrer = () => {
      if (minuteur) clearTimeout(minuteur);
      minuteur = setTimeout(() => {
        try {
          const data = new FormData(element);
          const valeurs: Record<string, string> = {};
          for (const [nom, valeur] of data.entries()) {
            if (typeof valeur === "string" && valeur !== "") valeurs[nom] = valeur;
          }
          window.localStorage.setItem(stockage, JSON.stringify(valeurs));
          setEnregistreA(
            new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h "),
          );
        } catch {
          // Idem : l'absence de stockage reste silencieuse.
        }
      }, 800);
    };

    element.addEventListener("input", enregistrer);
    element.addEventListener("change", enregistrer);
    return () => {
      element.removeEventListener("input", enregistrer);
      element.removeEventListener("change", enregistrer);
      if (minuteur) clearTimeout(minuteur);
    };
  }, [formulaire, cle]);

  return enregistreA;
}

const initial: ListingFormState = {};
const selectClass =
  "mt-1.5 flex h-11 w-full rounded-xl border border-line bg-surface-alt px-4 text-[15px] text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";
const areaClass =
  "mt-1.5 w-full rounded-xl border border-line bg-surface-alt px-4 py-3 text-[15px] text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";
const fieldsetClass = "grid gap-4 rounded-[1.75rem] border border-line bg-paper p-5 shadow-sm sm:p-7";
const legendClass = "text-[13px] font-medium uppercase tracking-[0.14em] text-indigo-dark";

/** Les quatre étapes du dépôt, dans l'ordre où on les remplit. */
const ETAPES = [
  { num: "1", titre: "Le cabinet", detail: "Kbis, statuts, ORIAS, pièce d’identité" },
  { num: "2", titre: "Le portefeuille", detail: "export des contrats, bordereaux, relevés" },
  { num: "3", titre: "Le contexte", detail: "motif, accompagnement prévu" },
  { num: "4", titre: "Envoi à l’étude", detail: "récapitulatif" },
] as const;

function FilAEtapes({ courante }: { courante: string }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {ETAPES.map((etape) => (
        <li
          key={etape.num}
          className={`rounded-2xl border p-3 ${
            etape.num === courante ? "border-indigo bg-indigo-soft" : "border-line bg-paper"
          }`}
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-indigo-dark">
            {etape.num} · {etape.titre}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-muted">{etape.detail}</p>
        </li>
      ))}
    </ol>
  );
}

/** Pièces attendues à une étape, avec le bouton qui les envoie. */
function PiecesAttendues({ titre, pieces, href }: { titre: string; pieces: readonly string[]; href: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-alt px-4 py-3">
      <p className="text-[13px] font-semibold text-ink">{titre}</p>
      <ul className="mt-2 grid gap-1 text-[13px] text-muted">
        {pieces.map((piece) => (
          <li key={piece}>○ {piece}</li>
        ))}
      </ul>
      <a href={href} className="mt-2 inline-block text-[13px] font-medium text-indigo-dark hover:underline">
        Envoyer ces pièces après l’enregistrement
      </a>
    </div>
  );
}

/** Valeurs de départ du formulaire : l'annonce à corriger, ou le profil du cabinet. */
export type ListingFormDefaults = Partial<Record<(typeof TEXT_FIELDS)[number], string>>;

const TEXT_FIELDS: readonly string[] = [
  "portfolioKind", "branchActivity", "desiredCessionDate", "cessionMotive", "negotiable", "sellerSupportMonths",
  "precompte", "precompteAmount", "transferVehicle", "oriasCategories", "distribution", "distanceShare",
  "complianceDema", "rcProInsurer", "employeeCount", "introducersCount", "softwareStack", "socialCommitments",
  "pendingLitigation", "ddaTraining", "amlProcedure", "sellerDependency", "premisesStatus", "exclusiveMandates",
  "stornoShare", "presentation",
] as const;

export function CreateListingForm({
  portfolioId,
  listingId,
  defaultCertify = false,
  qualityDefaults,
  defaults = {},
}: {
  portfolioId: string;
  /** Présent : le formulaire corrige ce brouillon au lieu d'en créer un. */
  listingId?: string;
  defaults?: ListingFormDefaults;
  defaultCertify?: boolean;
  qualityDefaults?: {
    commissionsYear1: string;
    commissionsYear2: string;
    commissionsYear3: string;
    recurrentSharePercent: string;
    managedAnnualPremium: string;
  };
}) {
  const [state, action, pending] = useActionState(listingId ? updateListingAction : createListingAction, initial);
  const formulaire = useRef<HTMLFormElement>(null);
  const enregistreA = useBrouillonLocal(formulaire, listingId ?? portfolioId);
  const d = defaults;
  return (
    <form ref={formulaire} action={action} className="grid max-w-2xl gap-6">
      <FilAEtapes courante="1" />
      <input type="hidden" name="portfolioId" value={portfolioId} />
      {listingId ? <input type="hidden" name="listingId" value={listingId} /> : null}
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>2 · Le portefeuille</legend>
        <PiecesAttendues
          titre="Pièces du portefeuille"
          pieces={["Export des contrats", "Bordereaux de commissions", "Relevés des compagnies", "États de production"]}
          href="#pieces"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="portfolioKind">Type de portefeuille</Label>
            <select id="portfolioKind" name="portfolioKind" className={selectClass} defaultValue={d.portfolioKind ?? "Mixte"}>
              <option value="IARD">IARD</option>
              <option value="Vie">Vie / prévoyance</option>
              <option value="Mixte">Mixte</option>
              <option value="Spécialisé">Spécialisé</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="branchActivity">Branche principale</Label>
            <Input id="branchActivity" name="branchActivity" defaultValue={d.branchActivity} placeholder="Santé, auto, IARD…" />
          </div>
        </div>
        <input type="hidden" name="sellerSupportMonths" value={d.sellerSupportMonths ?? "0"} />
      </fieldset>
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>2 · Le portefeuille, chiffres</legend>
        <p className="text-[13px] leading-relaxed text-muted">
          Trois exercices de commissions (montants, pas un pourcentage), la part
          du récurrent, et la prime annuelle gérée, distincte des commissions.
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
            <Label htmlFor="precompte">Commissions linéaires ou précompte</Label>
            <select id="precompte" name="precompte" required className={selectClass} defaultValue={d.precompte ?? ""}>
              <option value="" disabled>
                Choisir
              </option>
              <option value="no">Linéaire</option>
              <option value="yes">Précompte</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="precompteAmount">Montant du précompte</Label>
            <Input id="precompteAmount" name="precompteAmount" defaultValue={d.precompteAmount} placeholder="Si applicable" />
          </div>
        </div>
      </fieldset>
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>1 · Le cabinet</legend>
        <PiecesAttendues
          titre="Pièces du cabinet"
          pieces={["Extrait Kbis", "Statuts", "Justificatif ORIAS", "Pièce d’identité du représentant"]}
          href="#pieces"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="transferVehicle">Objet de la cession</Label>
            <select id="transferVehicle" name="transferVehicle" className={selectClass} defaultValue={d.transferVehicle ?? ""}>
              <option value="">Non précisé</option>
              <option value="parts">Cession de parts sociales</option>
              <option value="fonds">Cession de fonds de commerce / portefeuille</option>
              <option value="mixte">Mixte</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="oriasCategories">Catégories ORIAS</Label>
            <Input id="oriasCategories" name="oriasCategories" defaultValue={d.oriasCategories} placeholder="COA, MIA…" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="distribution">Mode de distribution</Label>
            <select id="distribution" name="distribution" className={selectClass} defaultValue={d.distribution ?? ""}>
              <option value="">Non précisé</option>
              <option value="agence">Agence / bureau</option>
              <option value="distance">Vente à distance</option>
              <option value="mixte">Mixte</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="distanceShare">Part vente à distance</Label>
            <Input id="distanceShare" name="distanceShare" defaultValue={d.distanceShare} placeholder="ex. 30 %" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="complianceDema">Démarchage téléphonique</Label>
            <select id="complianceDema" name="complianceDema" className={selectClass} defaultValue={d.complianceDema ?? ""}>
              <option value="">Non précisé</option>
              <option value="aucun">Aucun démarchage</option>
              <option value="conforme">Activité conforme Bloctel</option>
              <option value="a_regulariser">À régulariser</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rcProInsurer">Assureur RC professionnelle</Label>
            <Input id="rcProInsurer" name="rcProInsurer" defaultValue={d.rcProInsurer} placeholder="Compagnie, n° de contrat" />
          </div>
        </div>
      </fieldset>
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>3 · Le contexte</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="desiredCessionDate">Date de cession souhaitée</Label>
            <Input id="desiredCessionDate" name="desiredCessionDate" defaultValue={d.desiredCessionDate} placeholder="2026, T2 2027…" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="cessionMotive">Motif de la cession</Label>
            <select id="cessionMotive" name="cessionMotive" className={selectClass} defaultValue={d.cessionMotive ?? ""}>
              <option value="">Non précisé</option>
              <option value="retraite">Départ à la retraite</option>
              <option value="recentrage">Recentrage d’activité</option>
              <option value="transmission">Transmission</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="employeeCount">Effectif</Label>
            <Input id="employeeCount" name="employeeCount" defaultValue={d.employeeCount} placeholder="Salariés, mandataires" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="introducersCount">Apporteurs d’affaires</Label>
            <Input id="introducersCount" name="introducersCount" defaultValue={d.introducersCount} placeholder="Nombre, nature des accords" />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="softwareStack">Logiciels métier</Label>
            <Input id="softwareStack" name="softwareStack" defaultValue={d.softwareStack} placeholder="CRM, comparateur, GED…" />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="socialCommitments">Engagements sociaux</Label>
            <textarea
              id="socialCommitments"
              name="socialCommitments"
              defaultValue={d.socialCommitments}
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
              defaultValue={d.pendingLitigation}
              rows={3}
              className={areaClass}
              placeholder="Aucun, ou description sans nom de client final"
            />
          </div>
        </div>
      </fieldset>
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>3 · Le contexte, conformité</legend>
        <p className="text-[14px] leading-relaxed text-muted">
          Ces éléments aident l’acquéreur à vérifier l’éligibilité de la reprise
          (DDA, LCB-FT, ORIAS). Aucun nom de client final.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="ddaTraining">Formation DDA</Label>
            <select id="ddaTraining" name="ddaTraining" className={selectClass} defaultValue={d.ddaTraining ?? ""}>
              <option value="">Non précisé</option>
              <option value="a_jour">Formations à jour</option>
              <option value="en_cours">Plan de rattrapage en cours</option>
              <option value="a_regulariser">À régulariser</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="amlProcedure">Dispositif LCB-FT</Label>
            <select id="amlProcedure" name="amlProcedure" className={selectClass} defaultValue={d.amlProcedure ?? ""}>
              <option value="">Non précisé</option>
              <option value="formalise">Formalisé</option>
              <option value="en_cours">Mise à jour en cours</option>
              <option value="a_regulariser">À formaliser</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="sellerDependency">Dépendance au cédant</Label>
            <select id="sellerDependency" name="sellerDependency" className={selectClass} defaultValue={d.sellerDependency ?? ""}>
              <option value="">Non précisé</option>
              <option value="faible">Faible</option>
              <option value="moyenne">Moyenne</option>
              <option value="forte">Forte</option>
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="premisesStatus">Locaux</Label>
            <Input id="premisesStatus" name="premisesStatus" defaultValue={d.premisesStatus} placeholder="Bail, propriété, coworking…" className="mt-1.5 h-11 rounded-xl" />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="exclusiveMandates">Mandats exclusifs / compagnies clés</Label>
            <Input id="exclusiveMandates" name="exclusiveMandates" defaultValue={d.exclusiveMandates} placeholder="Sans nom de client final" className="mt-1.5 h-11 rounded-xl" />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="stornoShare">Storno / clawback commissions</Label>
            <Input id="stornoShare" name="stornoShare" defaultValue={d.stornoShare} placeholder="ex. 4 % sur 12 mois" className="mt-1.5 h-11 rounded-xl" />
          </div>
        </div>
      </fieldset>
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>3 · Le contexte, présentation</legend>
        <div className="grid gap-1">
          <Label htmlFor="presentation">Présentez votre portefeuille</Label>
          <textarea
            id="presentation"
            name="presentation"
              defaultValue={d.presentation}
            rows={7}
            className={areaClass}
            placeholder="Histoire, potentiel, profil des clients, points forts, compagnies, modalités de transmission…"
          />
        </div>
      </fieldset>
      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>4 · Envoi à l’étude</legend>
        <label className="flex items-start gap-2 text-[14px] text-ink">
          <input
            type="checkbox"
            name="certificationRequested"
            defaultChecked={defaultCertify}
            className="mt-1"
          />
          <span>
            Faire certifier mon portefeuille : la société et les pièces sont vérifiées avant la mise en
            ligne, et l’annonce porte le badge CERTIFIÉ.
          </span>
        </label>
        <div className="rounded-xl border border-line bg-surface-alt px-4 py-3">
          <p className="text-[14px] font-semibold text-ink">Ce que coûte la cession</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink">{CERTIFIED_FEE_LINE}</p>
        </div>
        <div className="rounded-xl bg-indigo-soft px-4 py-3">
          <p className="text-[14px] font-semibold text-ink">Et ensuite</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink">{PRICE_RULE}</p>
        </div>
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Envoi…" : listingId ? "Enregistrer les modifications" : "Continuer"}
          </Button>
          {enregistreA ? (
            <span className="text-[13px] text-muted">Enregistré automatiquement à {enregistreA}</span>
          ) : null}
        </div>
        <p id="pieces" className="text-[13px] leading-relaxed text-muted">
          Après enregistrement, déposez les pièces du cabinet et du portefeuille sur la fiche du dossier.
          L’acquéreur ne les voit qu’après avoir versé son dépôt de positionnement de 2,5 % dans un trust.
        </p>
      </fieldset>
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
  return <TinyForm action={publishListingAction} listingId={listingId} label="Soumettre mon dossier à l’équipe" pendingLabel="Envoi…" />;
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
