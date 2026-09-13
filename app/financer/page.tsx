import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/site";
import { presentPartners } from "@/lib/partners/status";

export const metadata: Metadata = {
  title: "Financer une acquisition",
  description:
    "Préparer le prêt professionnel pour acheter un portefeuille de courtage, sans confondre financement et séquestre.",
  alternates: { canonical: "/financer" },
};

export default function FinancerPage() {
  const financing = presentPartners().find((partner) => partner.id === "financing");

  return (
    <main className="bg-page pb-16">
      <section className="border-y border-line bg-indigo-soft">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            Acquisition
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight text-ink">
            Financer l’achat d’un portefeuille
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Le séquestre conserve le prix. Le financement, lui, aide l’acquéreur à
            réunir ce prix. {BRAND_NAME} ne prête pas et ne conseille pas un
            établissement de crédit.
          </p>
          {financing ? (
            <p className="mt-4 inline-flex rounded-full bg-paper px-3 py-1 text-[13px] font-medium text-ink">
              {financing.badge}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <article className="rounded-3xl border border-line bg-paper p-7">
          <h2 className="text-xl font-semibold text-ink">À quoi ça sert</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Un courtier en financement professionnel, CrediPro dès validation du
            contrat, monte le dossier de prêt, met les banques en concurrence et
            suit le déblocage. Deux cas : acheter avec un prêt, ou refinancer un
            achat déjà payé comptant pour dégager de la trésorerie. Rien de cela
            ne remplace Trustap : l’argent du prêt rejoint le séquestre comme le
            ferait un paiement comptant.
          </p>
        </article>
        <article className="mt-6 rounded-3xl border border-line bg-paper p-7">
          <h2 className="text-xl font-semibold text-ink">Ce qui se passe aujourd’hui</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Le formulaire chez le partenaire s’ouvrira dès validation du contrat.
            En attendant, un entretien de trente minutes avec un conseiller permet
            de cadrer l’apport, le calendrier et le montant visé, sans engagement.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/rendez-vous">Réserver un entretien de 30 min</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/partenaires">Voir le circuit de paiement</Link>
            </Button>
          </div>
        </article>
      </section>
    </main>
  );
}
