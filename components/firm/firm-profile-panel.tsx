"use client";

import { useActionState, useState } from "react";
import { saveFirmProfileSectionAction, type FirmProfileState } from "@/app/actions/firm-profile";
import { Button } from "@/components/ui/button";
import { keepFormSubmit } from "@/components/ui/keep-form";
import { FIRM_PROFILE_SECTIONS, sectionCompletion, type FirmProfile, type ProfileSection } from "@/lib/firm/profile";
import { cn } from "@/lib/utils";

const initial: FirmProfileState = {};

const TEINTES: Record<ProfileSection["key"], string> = {
  positionnement: "#2563eb",
  organisation: "#0d9488",
  conformite: "#7c3aed",
  strategie: "#d97706",
};

/**
 * Profil du cabinet : quatre volets, chacun avec son pourcentage.
 *
 * Un clic sur un volet l'ouvre sous les cartes ; on enregistre volet par volet,
 * sans tout remplir d'un coup.
 */
export function FirmProfilePanel({ profile }: { profile: FirmProfile }) {
  const [ouvert, setOuvert] = useState<ProfileSection["key"]>(
    FIRM_PROFILE_SECTIONS.find((s) => sectionCompletion(profile, s) < 100)?.key ?? "positionnement",
  );
  const section = FIRM_PROFILE_SECTIONS.find((s) => s.key === ouvert)!;
  return (
    <div className="grid gap-4">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FIRM_PROFILE_SECTIONS.map((s) => {
          const pct = sectionCompletion(profile, s);
          const actif = s.key === ouvert;
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => setOuvert(s.key)}
                className={cn(
                  "w-full rounded-2xl border bg-paper p-4 text-left transition hover:border-indigo",
                  actif ? "border-indigo shadow-sm" : "border-line",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TEINTES[s.key] }} />
                  <span className="text-[15px] font-semibold text-ink">{s.title}</span>
                </span>
                <span className="mt-3 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-alt">
                    <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TEINTES[s.key] }} />
                  </span>
                  <span className="tabular text-[13px] font-semibold text-ink">{pct} %</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <SectionForm key={section.key} section={section} values={profile[section.key] ?? {}} />
    </div>
  );
}

function SectionForm({ section, values }: { section: ProfileSection; values: Record<string, string | string[]> }) {
  const [state, action, pending] = useActionState(saveFirmProfileSectionAction, initial);
  return (
    <form onSubmit={keepFormSubmit(action)} className="rounded-2xl border border-line bg-paper p-5">
      <input type="hidden" name="section" value={section.key} />
      <h3 className="text-[17px] font-semibold text-ink">{section.title}</h3>
      <p className="text-[14px] text-muted">{section.lede}</p>
      <div className="mt-4 grid gap-5">
        {section.fields.map((f) => {
          const v = values[f.key];
          if (f.type === "text") {
            return (
              <label key={f.key} className="grid max-w-md gap-1.5 text-[14px] font-medium text-ink">
                {f.label}
                <input
                  name={f.key}
                  defaultValue={typeof v === "string" ? v : ""}
                  placeholder={f.hint}
                  maxLength={200}
                  className="h-11 rounded-xl border border-line bg-surface px-3 text-[15px] text-ink focus:border-indigo focus:outline-none"
                />
              </label>
            );
          }
          return (
            <fieldset key={f.key}>
              <legend className="text-[14px] font-medium text-ink">{f.label}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(f.options ?? []).map((o) => {
                  const coche = Array.isArray(v) ? v.includes(o) : v === o;
                  return (
                    <label key={o} className="cursor-pointer">
                      <input
                        type={f.type === "many" ? "checkbox" : "radio"}
                        name={f.key}
                        value={o}
                        defaultChecked={coche}
                        className="peer sr-only"
                      />
                      <span className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-3.5 text-[13px] text-ink peer-checked:border-indigo peer-checked:bg-indigo-soft peer-checked:font-semibold peer-checked:text-indigo-dark peer-focus-visible:ring-2 peer-focus-visible:ring-indigo">
                        {o}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : `Enregistrer « ${section.title} »`}
        </Button>
        {state.ok ? <span className="text-[14px] font-medium text-ok">{state.ok}</span> : null}
        {state.error ? <span className="text-[14px] font-medium text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}
