"use client";

import { useActionState } from "react";
import { updateSearchPrefsAction, type ProfileFormState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SearchPrefs } from "@/lib/account/search-prefs";

const initial: ProfileFormState = {};
const field =
  "h-11 rounded-xl border-line bg-surface-alt px-4 text-[15px] focus-visible:border-indigo focus-visible:ring-indigo";

export function SearchPrefsForm({ prefs }: { prefs: SearchPrefs }) {
  const [state, action, pending] = useActionState(updateSearchPrefsAction, initial);

  return (
    <form action={action} className="grid gap-4">
      <p className="text-[14px] leading-relaxed text-muted">
        Ces critères filtrent la salle de marché une fois connecté. Ils ne sont
        pas exposés aux visiteurs.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="search-zone" className="text-[13px] font-medium text-ink">
            Zone
          </label>
          <Input id="search-zone" name="zone" defaultValue={prefs.zone} placeholder="Région ou département" className={`mt-1.5 ${field}`} />
        </div>
        <div>
          <label htmlFor="search-risk" className="text-[13px] font-medium text-ink">
            Branche
          </label>
          <Input id="search-risk" name="risk" defaultValue={prefs.risk} placeholder="Santé, automobile…" className={`mt-1.5 ${field}`} />
        </div>
        <div>
          <label htmlFor="search-carrier" className="text-[13px] font-medium text-ink">
            Compagnie
          </label>
          <Input id="search-carrier" name="carrier" defaultValue={prefs.carrier} className={`mt-1.5 ${field}`} />
        </div>
        <div>
          <label htmlFor="search-segment" className="text-[13px] font-medium text-ink">
            Clientèle
          </label>
          <Input id="search-segment" name="segment" defaultValue={prefs.segment} className={`mt-1.5 ${field}`} />
        </div>
        <div>
          <label htmlFor="search-maxPrice" className="text-[13px] font-medium text-ink">
            Budget maximum
          </label>
          <Input id="search-maxPrice" name="maxPrice" defaultValue={prefs.maxPrice} placeholder="80 000" className={`mt-1.5 ${field}`} />
        </div>
        <label className="flex items-center gap-2.5 self-end pb-2 text-[15px] text-ink">
          <input
            type="checkbox"
            name="certifiedOnly"
            defaultChecked={prefs.certifiedOnly}
            className="h-5 w-5 rounded border-line"
          />
          Uniquement les portefeuilles certifiés
        </label>
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-ok">Critères enregistrés.</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Enregistrement…" : "Enregistrer mes critères"}
      </Button>
    </form>
  );
}
