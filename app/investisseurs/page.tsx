import type { Metadata } from "next";
import Link from "next/link";
import { ToolIcon, type ToolIconName } from "@/components/app/toolbox";
import { ADVISOR_BOOKING_HREF, CTA_ADVISOR } from "@/lib/copy/market";
import {
  INVESTORS_CLOSING_TITLE,
  INVESTORS_KICKER,
  INVESTORS_LEDE,
  INVESTORS_PROTECTION,
  INVESTORS_PROTECTION_TITLE,
  INVESTORS_SIGNATURE,
  INVESTORS_SIGNUP_CTA,
  INVESTORS_SIGNUP_HREF,
  INVESTORS_STEPS,
  INVESTORS_STEPS_TITLE,
  INVESTORS_TITLE,
} from "@/lib/copy/investors";

/*
 * Une icône par protection, dans l'ordre des trois cartes : le cadenas du
 * trust, le coffre du séquestre, le document validé des dossiers vérifiés.
 * Elles vivent ici et non dans les textes : `lib/copy` ne porte que des mots.
 */
const PROTECTION_ICONS: ToolIconName[] = ["lock", "vault", "file-check"];

export const metadata: Metadata = {
  title: "Investisseurs",
  description: INVESTORS_LEDE,
  alternates: { canonical: "/investisseurs" },
};

/**
 * La page investisseurs.
 *
 * Cinq blocs, et rien d'autre : ce que c'est, trois chiffres, trois étapes, ce
 * qui protège l'argent, l'entretien. Le lecteur n'est pas courtier, il ne doit
 * rien avoir à décoder. Le profil investisseur se remplit après la création du
 * compte, dans l'espace investisseur, pas ici.
 */
export default function InvestisseursPage() {
  return (
    <main>
      {/* 1. Le bandeau. */}
      <section className="bg-gradient-to-br from-[#4f46e5] to-[#3730a3] text-white">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
            {INVESTORS_KICKER}
          </p>
          <h1 className="mt-5 text-[2rem] font-bold leading-[1.15] tracking-tight sm:text-5xl">
            {INVESTORS_TITLE}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-white/80 sm:text-[17px]">
            {INVESTORS_LEDE}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={ADVISOR_BOOKING_HREF}
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-[15px] font-semibold text-[#4338ca] hover:bg-white/90"
            >
              {CTA_ADVISOR}
            </Link>
            <Link
              href={INVESTORS_SIGNUP_HREF}
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/50 px-7 text-[15px] font-semibold text-white hover:bg-white/10"
            >
              {INVESTORS_SIGNUP_CTA}
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Les trois étapes. */}
      <section className="bg-paper">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="text-center text-[1.5rem] font-bold tracking-tight text-ink sm:text-[1.75rem]">
            {INVESTORS_STEPS_TITLE}
          </h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-6">
            {INVESTORS_STEPS.map((step) => (
              <li key={step.num} className="text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-indigo-soft text-[16px] font-bold text-indigo">
                  {step.num}
                </span>
                <h3 className="mt-5 text-[17px] font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-[15px] text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Ce qui protège l'argent. */}
      <section className="bg-surface-alt">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-[1.5rem] font-bold tracking-tight text-ink sm:text-[1.75rem]">
            {INVESTORS_PROTECTION_TITLE}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {INVESTORS_PROTECTION.map((point, index) => (
              <article
                key={point.title}
                className="rounded-2xl border border-line bg-paper px-6 py-8 text-center"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-soft text-indigo">
                  <ToolIcon name={PROTECTION_ICONS[index]!} className="h-6 w-6" strokeWidth={1.6} />
                </span>
                <h3 className="mt-5 text-[16px] font-semibold text-ink">{point.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{point.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. L'entretien. */}
      <section className="bg-surface-alt pb-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col gap-6 rounded-3xl bg-indigo-soft px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <div className="min-w-0">
              <h2 className="text-[1.25rem] font-bold tracking-tight text-ink">
                {INVESTORS_CLOSING_TITLE}
              </h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{INVESTORS_SIGNATURE}</p>
            </div>
            <Link
              href={ADVISOR_BOOKING_HREF}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-indigo px-7 text-[15px] font-semibold !text-white hover:bg-indigo-dark"
            >
              {CTA_ADVISOR}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
