import type { Metadata } from "next";
import Link from "next/link";
import { InvestorInquiryForm } from "@/components/investor/inquiry-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Investisseurs",
  description:
    "Investisseurs privés et family offices : suivez des dossiers de cession sous alias.",
  alternates: { canonical: "/investisseurs" },
};

export default function InvestisseursPage() {
  return (
    <main>
      <section className="border-y border-line bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            Troisième rôle
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight leading-tight text-ink">
            Je suis investisseur
          </h1>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/investisseurs/opportunites">Voir les opportunités</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/inscription?voie=investir">Créer un compte</Link>
            </Button>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Pour les investisseurs</h2>
          <ul className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted">
            <li>Vous choisissez le montant que vous souhaitez investir.</li>
            <li>Vous pouvez signer un mandat de gestion.</li>
            <li>La bourse du portefeuille vous conseille et vous accompagne.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-paper p-7">
          <h2 className="text-xl font-semibold text-ink">Se positionner</h2>
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
