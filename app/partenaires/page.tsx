import Link from "next/link";
import { TRUST_PILLARS } from "@/lib/partners/catalog";
import { presentPartners } from "@/lib/partners/status";
import { PartnerGrid, PartnerStrip } from "@/components/partners/partner-grid";
import { BRAND_NAME } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paiement et signatures sécurisés",
  description:
    "Stripe pour l’accès, Trustap pour le séquestre, Yousign ou DocuSign pour les actes. La bourse du portefeuille ne reçoit pas le prix de cession.",
  alternates: { canonical: "/partenaires" },
};

export default function PartenairesPage() {
  const partners = presentPartners();

  return (
    <main className="bg-page pb-16">
      <section className="border-y border-line bg-indigo-soft">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            Confiance
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight text-ink">
            L’argent et les signatures ne restent pas chez {BRAND_NAME}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Chaque étape a un prestataire dédié. Les contrats se valident ensuite.
            Le circuit est déjà visible pour que cédant et acquéreur sachent qui
            fera quoi, avant le premier euro de cession.
          </p>
          <div className="mt-6">
            <PartnerStrip partners={partners} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2">
          {TRUST_PILLARS.map((pillar) => (
            <article key={pillar.title} className="rounded-3xl border border-line bg-paper p-6">
              <h2 className="text-lg font-semibold text-ink">{pillar.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{pillar.body}</p>
            </article>
          ))}
        </div>

        <h2 className="mt-12 font-serif text-2xl font-semibold text-ink">Les prestataires du circuit</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Une pastille verte signale un rail déjà branché. Les autres sont prêts.
          Il suffit de poser la clé après signature du contrat, sans refaire le
          parcours métier.
        </p>
        <div className="mt-6">
          <PartnerGrid partners={partners} />
        </div>

        <p className="mt-10 text-[14px] leading-relaxed text-muted">
          Pour financer une acquisition, voir aussi{" "}
          <Link href="/financer" className="font-medium text-indigo-dark underline-offset-2 hover:underline">
            Financer un portefeuille
          </Link>
          . Les règles figurent dans les{" "}
          <Link
            href="/conditions-generales"
            className="font-medium text-indigo-dark underline-offset-2 hover:underline"
          >
            conditions générales
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
