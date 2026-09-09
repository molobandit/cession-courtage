import type { Metadata } from "next";
import { InvestorInquiryForm } from "@/components/investor/inquiry-form";
import { BRAND_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Investisseurs",
  description:
    "Fonds, holdings et courtiers en croissance : indiquez votre ticket et vos zones. Les dossiers vous sont présentés sous alias.",
  alternates: { canonical: "/investisseurs" },
};

export default function InvestisseursPage() {
  return (
    <main>
      <section className="border-y border-line bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            Troisième voie
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink">
            Investir dans un portefeuille de courtage
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted">
            {BRAND_NAME} s’adresse aussi aux fonds, holdings et courtiers en
            croissance. Vous ne voyez jamais de donnée nominative de client final.
            Les dossiers restent sous alias jusqu’au dépôt prévu pour les
            coordonnées.
          </p>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-ink">Ce que nous présentons</h2>
          <ul className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted">
            <li>Des portefeuilles dont le ticket est dans votre fourchette.</li>
            <li>La zone, le mix de branches, les compagnies et les commissions annuelles.</li>
            <li>Le badge certifié lorsqu’une revue interne a déjà eu lieu.</li>
            <li>Aucune raison sociale avant le dépôt prévu pour les coordonnées.</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-line bg-paper p-7">
          <h2 className="font-serif text-xl font-semibold text-ink">Se positionner</h2>
          <p className="mt-2 text-[15px] text-muted">
            Grain maximal : votre structure et votre contact professionnel.
          </p>
          <div className="mt-6">
            <InvestorInquiryForm />
          </div>
        </div>
      </div>
    </main>
  );
}
