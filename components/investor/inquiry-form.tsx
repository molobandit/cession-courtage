"use client";

import { useActionState } from "react";
import { createInvestorInquiryAction, type InvestorFormState } from "@/app/actions/investors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: InvestorFormState = {};

const FIELD =
  "mt-2 h-11 w-full rounded-full border border-line bg-surface-alt px-4 text-[15px] text-ink";

export function InvestorInquiryForm() {
  const [state, action, pending] = useActionState(createInvestorInquiryAction, initial);

  if (state.ok) {
    return (
      <p className="rounded-3xl border border-line bg-indigo-soft p-6 text-[15px] leading-relaxed text-ink">
        Votre manifestation d’intérêt est enregistrée. Nous vous recontactons
        uniquement sur les dossiers correspondant à vos critères, sous alias, sans
        jamais transmettre de donnée nominative de client final.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="organisation" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Structure
          </Label>
          <Input id="organisation" name="organisation" required className={FIELD} />
        </div>
        <div>
          <Label htmlFor="fullName" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Nom
          </Label>
          <Input id="fullName" name="fullName" required className={FIELD} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="email" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            E-mail professionnel
          </Label>
          <Input id="email" name="email" type="email" required className={FIELD} />
        </div>
        <div>
          <Label htmlFor="phone" className="text-[15px] font-medium normal-case tracking-normal text-ink">
            Téléphone
          </Label>
          <Input id="phone" name="phone" type="tel" className={FIELD} />
        </div>
      </div>
      <div>
        <Label htmlFor="investorType" className="text-[15px] font-medium normal-case tracking-normal text-ink">
          Profil
        </Label>
        <select id="investorType" name="investorType" required className={FIELD}>
          <option value="">Choisir</option>
          <option value="GROWING_BROKER">Courtier en croissance</option>
          <option value="HOLDING">Holding de courtage</option>
          <option value="FUND">Fonds</option>
          <option value="FAMILY_OFFICE">Family office</option>
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
          Zones visées
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
        <Label htmlFor="intervention" className="text-[15px] font-medium normal-case tracking-normal text-ink">
          Intervention
        </Label>
        <select id="intervention" name="intervention" required className={FIELD}>
          <option value="">Choisir</option>
          <option value="ACQUISITION">Rachat de portefeuille</option>
          <option value="PARTNERSHIP">Partenariat ou rapprochement</option>
          <option value="BOTH">Les deux</option>
        </select>
      </div>
      {state.error ? <p className="text-[15px] text-danger">{state.error}</p> : null}
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Envoi…" : "Se positionner"}
      </Button>
    </form>
  );
}
