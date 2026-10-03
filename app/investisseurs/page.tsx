import type { Metadata } from "next";
import Link from "next/link";
import { InvestorInquiryForm } from "@/components/investor/inquiry-form";
import { Button } from "@/components/ui/button";
import { ADVISOR_BOOKING_HREF, CTA_ADVISOR } from "@/lib/copy/market";
import {
  INVESTORS_BEFORE,
  INVESTORS_BEFORE_TITLE,
  INVESTORS_CLOSING_BODY,
  INVESTORS_CLOSING_TITLE,
  INVESTORS_KICKER,
  INVESTORS_LEDE,
  INVESTORS_MARKET_LEDE,
  INVESTORS_MARKET_POINTS,
  INVESTORS_MARKET_TITLE,
  INVESTORS_PROTECTION,
  INVESTORS_PROTECTION_LEDE,
  INVESTORS_PROTECTION_TITLE,
  INVESTORS_SIGNATURE,
  INVESTORS_STEPS,
  INVESTORS_STEPS_LEDE,
  INVESTORS_STEPS_TITLE,
  INVESTORS_TITLE,
} from "@/lib/copy/investors";

export const metadata: Metadata = {
  title: "Investisseurs",
  description: INVESTORS_LEDE,
  alternates: { canonical: "/investisseurs" },
};

/**
 * La page investisseurs, bâtie sur le dossier investisseurs.
 *
 * Même déroulé que le PDF : le marché, notre modèle, ce qu'on regarde, ce qui
 * protège l'argent, puis l'entretien. Rien de plus, et aucune promesse de
 * rendement.
 */
export default function InvestisseursPage() {
  return (
    <main>
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo-dark">
            {INVESTORS_KICKER}
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-ink">
            {INVESTORS_TITLE}
          </h1>
          <p className="mt-5 max-w-3xl text-[17px] leading-relaxed text-muted">{INVESTORS_LEDE}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href={ADVISOR_BOOKING_HREF}>{CTA_ADVISOR}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/inscription?voie=investir">Créer un compte investisseur</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink">{INVESTORS_MARKET_TITLE}</h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">{INVESTORS_MARKET_LEDE}</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {INVESTORS_MARKET_POINTS.map((point) => (
              <article key={point.title} className="border-t-2 border-indigo pt-4">
                <h3 className="text-[17px] font-semibold text-ink">{point.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{point.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink">{INVESTORS_STEPS_TITLE}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{INVESTORS_STEPS_LEDE}</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INVESTORS_STEPS.map((step) => (
              <li key={step.num} className="rounded-2xl border border-line p-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-indigo-dark">
                  {step.num}
                </p>
                <h3 className="mt-3 text-[17px] font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-2xl bg-indigo-soft p-6">
            <h3 className="text-[17px] font-semibold text-ink">{INVESTORS_BEFORE_TITLE}</h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {INVESTORS_BEFORE.map((item) => (
                <li key={item} className="flex gap-2 text-[14px] leading-relaxed text-ink">
                  <span className="font-semibold text-indigo-dark">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink">{INVESTORS_PROTECTION_TITLE}</h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">
            {INVESTORS_PROTECTION_LEDE}
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {INVESTORS_PROTECTION.map((point) => (
              <article key={point.title}>
                <h3 className="text-[16px] font-semibold text-ink">{point.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{point.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-deep-soft">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div className="text-white">
            <h2 className="text-2xl font-bold tracking-tight">{INVESTORS_CLOSING_TITLE}</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/80">
              {INVESTORS_CLOSING_BODY}
            </p>
            <p className="mt-5 text-[14px] font-medium text-white/90">{INVESTORS_SIGNATURE}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-white/40 bg-white text-deep-soft hover:bg-white/90">
                <Link href={ADVISOR_BOOKING_HREF}>{CTA_ADVISOR}</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10">
                <Link href="/inscription?voie=investir">Créer un compte investisseur</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-paper p-7">
            <h3 className="text-xl font-semibold text-ink">Se positionner</h3>
            <p className="mt-2 text-[15px] text-muted">
              Grain maximal : votre structure et votre contact professionnel.
            </p>
            <div className="mt-6">
              <InvestorInquiryForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
