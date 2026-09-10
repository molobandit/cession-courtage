"use client";

import { useActionState } from "react";
import { createInvestorInquiryAction, type InvestorFormState } from "@/app/actions/investors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: InvestorFormState = {};

const FIELD =
  "mt-2 h-11 w-full rounded-md border border-line bg-surface-alt px-4 text-[15px] text-ink";

export function InvestorInquiryForm({ listingId }: { listingId?: string }) {
  const [state, action, pending] = useActionState(createInvestorInquiryAction, initial);

  if (state.ok) {
    return (
      <p className="rounded-xl border border-line bg-indigo-soft p-6 text-[15px] leading-relaxed text-ink">
        Votre positionnement est enregistré. Nous vous recontactons uniquement
        sur les dossiers correspondant à vos critères, sous alias, sans donnée
        nominative de client final.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-5">
      {listingId ? <input type="hidden" name="listingId" value={listingId} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="organisation" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Nom / société
          </Label>
          <Input id="organisation" name="organisation" required className={FIELD} />
        </div>
        <div>
          <Label htmlFor="fullName" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Nom et prénom
          </Label>
          <Input id="fullName" name="fullName" required className={FIELD} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="jobTitle" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Fonction
          </Label>
          <Input id="jobTitle" name="jobTitle" className={FIELD} />
        </div>
        <div>
          <Label htmlFor="phone" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Téléphone
          </Label>
          <Input id="phone" name="phone" type="tel" className={FIELD} />
        </div>
      </div>
      <div>
        <Label htmlFor="email" className="text-[15px] font-medium normal-case tracking-normal text-ink">
          E-mail
        </Label>
        <Input id="email" name="email" type="email" required className={FIELD} />
      </div>
      <div>
        <Label htmlFor="investorType" className="text-[15px] font-medium normal-case tracking-normal text-ink">
          Type d’investisseur
        </Label>
        <select id="investorType" name="investorType" required className={FIELD}>
          <option value="">Choisir</option>
          <option value="PRIVATE">Investisseur privé / particulier</option>
          <option value="FAMILY_OFFICE">Family office</option>
          <option value="FUND">Société d’investissement / fonds</option>
          <option value="ENTREPRENEUR">Entrepreneur</option>
          <option value="GROWING_BROKER">Professionnel du secteur</option>
          <option value="HOLDING">Holding</option>
          <option value="OTHER">Autre</option>
        </select>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="ticketMinEur" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Ticket minimum
          </Label>
          <Input
            id="ticketMinEur"
            name="ticketMinEur"
            inputMode="numeric"
            placeholder="20 000"
            className={`${FIELD} tabular text-right`}
          />
        </div>
        <div>
          <Label htmlFor="ticketMaxEur" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Ticket maximum
          </Label>
          <Input
            id="ticketMaxEur"
            name="ticketMaxEur"
            inputMode="numeric"
            placeholder="200 000"
            className={`${FIELD} tabular text-right`}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="zones" className="text-[15px] font-medium normal-case tracking-normal text-ink">
          Zone géographique
        </Label>
        <Input
          id="zones"
          name="zones"
          required
          placeholder="Île-de-France, Rhône, national"
          className={FIELD}
        />
      </div>
      <div>
        <Label htmlFor="sectors" className="text-[15px] font-medium normal-case tracking-normal text-ink">
          Secteurs recherchés
        </Label>
        <Input
          id="sectors"
          name="sectors"
          placeholder="IARD, santé, prévoyance…"
          className={FIELD}
        />
      </div>
      <div>
        <Label htmlFor="intervention" className="text-[15px] font-medium normal-case tracking-normal text-ink">
          Type d’intervention
        </Label>
        <select id="intervention" name="intervention" required className={FIELD}>
          <option value="">Choisir</option>
          <option value="FINANCING">Financement</option>
          <option value="EQUITY">Prise de participation</option>
          <option value="DEBT">Dette</option>
          <option value="CO_INVEST">Co-investissement</option>
          <option value="OTHER">Autre</option>
        </select>
      </div>
      {state.error ? <p className="text-[15px] text-danger">{state.error}</p> : null}
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Envoi…" : "Je souhaite me positionner"}
      </Button>
    </form>
  );
}
