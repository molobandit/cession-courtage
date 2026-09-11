"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LEGAL_FORMS } from "@/lib/validations/auth";
import { DISTRIBUTION_LABELS } from "@/lib/labels";
import type { DistributionMode } from "@prisma/client";

const initial: ProfileFormState = {};
const field =
  "h-11 rounded-xl border-line bg-surface-alt px-4 text-[15px] focus-visible:border-indigo focus-visible:ring-indigo";

export function ProfileForm({
  firstName,
  lastName,
  phone,
  jobTitle,
  email,
  orias,
  firm,
}: {
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  email: string;
  orias: string;
  firm: {
    legalName: string;
    legalForm: string;
    address: string;
    postalCode: string;
    city: string;
    website: string;
    siren: string;
    foundedYear: string;
    headcount: string;
    distributionMode: string;
  } | null;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);

  return (
    <form action={action} className="grid gap-8">
      <section id="identite">
        <h2 className="text-lg font-semibold text-ink">Identité</h2>
        <p className="mt-1 text-[14px] text-muted">
          Ces informations restent internes jusqu’au dépôt de 2,5 % du prix, qui
          ouvre vos coordonnées à l’acquéreur engagé.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="text-[13px] font-medium text-ink">
              Prénom
            </label>
            <Input id="firstName" name="firstName" required defaultValue={firstName} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label htmlFor="lastName" className="text-[13px] font-medium text-ink">
              Nom
            </label>
            <Input id="lastName" name="lastName" required defaultValue={lastName} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label htmlFor="phone" className="text-[13px] font-medium text-ink">
              Téléphone professionnel
            </label>
            <Input id="phone" name="phone" required defaultValue={phone} className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label htmlFor="jobTitle" className="text-[13px] font-medium text-ink">
              Fonction
            </label>
            <Input id="jobTitle" name="jobTitle" defaultValue={jobTitle} placeholder="Gérant, directeur…" className={`mt-1.5 ${field}`} />
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink">E-mail</label>
            <Input readOnly value={email} className={`mt-1.5 ${field} opacity-70`} />
            <p className="mt-1 text-[12px] text-muted">L’e-mail de connexion ne se modifie pas ici.</p>
          </div>
          {orias ? (
            <div>
              <label className="text-[13px] font-medium text-ink">Numéro ORIAS</label>
              <Input readOnly value={orias} className={`mt-1.5 ${field} opacity-70`} />
            </div>
          ) : null}
        </div>
      </section>

      {firm ? (
        <section id="cabinet" className="border-t border-line pt-8">
          <h2 className="text-lg font-semibold text-ink">Cabinet</h2>
          <p className="mt-1 text-[14px] text-muted">
            Fiche société. Le SIREN et l’ORIAS ne se modifient pas ici.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="legalName" className="text-[13px] font-medium text-ink">
                Dénomination
              </label>
              <Input id="legalName" name="legalName" required defaultValue={firm.legalName} className={`mt-1.5 ${field}`} />
            </div>
            <div>
              <label htmlFor="legalForm" className="text-[13px] font-medium text-ink">
                Forme juridique
              </label>
              <select
                id="legalForm"
                name="legalForm"
                defaultValue={firm.legalForm}
                className={`mt-1.5 w-full ${field}`}
              >
                {LEGAL_FORMS.map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink">SIREN</label>
              <Input readOnly value={firm.siren} className={`mt-1.5 ${field} opacity-70`} />
            </div>
            <div>
              <label htmlFor="website" className="text-[13px] font-medium text-ink">
                Site web
              </label>
              <Input id="website" name="website" defaultValue={firm.website} placeholder="https://" className={`mt-1.5 ${field}`} />
            </div>
            <div>
              <label htmlFor="foundedYear" className="text-[13px] font-medium text-ink">
                Année de création
              </label>
              <Input id="foundedYear" name="foundedYear" defaultValue={firm.foundedYear} placeholder="2008" className={`mt-1.5 ${field}`} />
            </div>
            <div>
              <label htmlFor="headcount" className="text-[13px] font-medium text-ink">
                Effectif
              </label>
              <Input id="headcount" name="headcount" defaultValue={firm.headcount} placeholder="Salariés" className={`mt-1.5 ${field}`} />
            </div>
            <div>
              <label htmlFor="distributionMode" className="text-[13px] font-medium text-ink">
                Mode de distribution
              </label>
              <select
                id="distributionMode"
                name="distributionMode"
                defaultValue={firm.distributionMode}
                className={`mt-1.5 w-full ${field}`}
              >
                {(Object.keys(DISTRIBUTION_LABELS) as DistributionMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {DISTRIBUTION_LABELS[mode]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="text-[13px] font-medium text-ink">
                Adresse du siège
              </label>
              <Input id="address" name="address" required defaultValue={firm.address} className={`mt-1.5 ${field}`} />
            </div>
            <div>
              <label htmlFor="postalCode" className="text-[13px] font-medium text-ink">
                Code postal
              </label>
              <Input id="postalCode" name="postalCode" required defaultValue={firm.postalCode} className={`mt-1.5 ${field}`} />
            </div>
            <div>
              <label htmlFor="city" className="text-[13px] font-medium text-ink">
                Ville
              </label>
              <Input id="city" name="city" required defaultValue={firm.city} className={`mt-1.5 ${field}`} />
            </div>
          </div>
        </section>
      ) : null}

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-ok">Modifications enregistrées.</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Enregistrement…" : "Enregistrer les modifications"}
      </Button>
    </form>
  );
}