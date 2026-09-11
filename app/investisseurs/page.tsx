import type { Metadata } from "next";
import Link from "next/link";
import { InvestorInquiryForm } from "@/components/investor/inquiry-form";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Investisseurs",
  description:
    "Investisseurs privés et family offices : suivez des dossiers sous alias, sans donnée nominative de client final.",
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
          <p className="mt-5 text-[15px] leading-relaxed text-muted">
            {BRAND_NAME} s’adresse aux investisseurs privés, family offices et
            structures qui souhaitent suivre des dossiers de cession sous alias.
            Un dépôt de 2,5 % du prix ouvre les coordonnées du cabinet cédant.
            Aucune donnée nominative de client final.
          </p>
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
          <h2 className="text-2xl font-bold tracking-tight text-ink">Règles pour les non-métiers</h2>
          <ul className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted">
            <li>Le dépôt de 2,5 % du prix de cession marque un intérêt qualifié sur le dossier.</li>
            <li>Les coordonnées du cabinet cédant s’ouvrent après ce dépôt, pas avant.</li>
            <li>Les dossiers restent sous alias jusqu’à ce dépôt.</li>
            <li>Aucune donnée nominative de client final n’est communiquée.</li>
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
