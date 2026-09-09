import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";

export const metadata: Metadata = {
  title: "Portefeuille certifié",
  description:
    "Différence entre une annonce simple et un portefeuille certifié après revue interne des commissions, du mix et des compagnies.",
  alternates: { canonical: "/certification" },
};

export default function CertificationPage() {
  return (
    <main>
      <section className="border-y border-line bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-dark">
            Qualité de l’annonce
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink">
            Annonce simple ou portefeuille certifié
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted">
            Deux niveaux, un même anonymat. Ni raison sociale, ni commune, ni
            donnée nominative de client final. Le badge certifié indique qu’une
            revue interne a déjà eu lieu.
          </p>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 lg:grid-cols-2">
        <article className="rounded-3xl border border-line bg-paper p-7">
          <h2 className="font-serif text-2xl font-semibold text-ink">Annonce simple</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Vous importez un bordereau anonymisé, vous fixez un prix, vous publiez
            sous alias. Suffisant pour tester le marché sans délai.
          </p>
          <ul className="mt-5 space-y-2 text-[15px] text-muted">
            <li>Publication sous Portefeuille #NNNNN</li>
            <li>Zone, commissions, mix, compagnies</li>
            <li>Messagerie anonyme et offres scellées</li>
          </ul>
        </article>
        <article className="rounded-3xl border border-indigo-line bg-indigo-soft p-7">
          <h2 className="font-serif text-2xl font-semibold text-ink">Portefeuille certifié</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Une revue interne porte sur le mix, les compagnies, les commissions et
            le précompte. Le badge « Certifié » apparaît dans le catalogue.
          </p>
          <ul className="mt-5 space-y-2 text-[15px] text-muted">
            <li>Même anonymat qu’une annonce simple</li>
            <li>Badge visible avant toute prise de contact</li>
            <li>Les coordonnées restent derrière le dépôt de {INTEREST_DEPOSIT_LABEL}</li>
          </ul>
        </article>
      </div>
      <div className="mx-auto max-w-3xl px-4 pb-16 text-center">
        <p className="text-[15px] leading-relaxed text-muted">
          La certification ne garantit pas un prix. Elle atteste qu’un dossier a
          été relu avant d’être proposé aux acquéreurs et aux investisseurs.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/ceder">Déposer une annonce</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/annonces">Voir les portefeuilles certifiés</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
