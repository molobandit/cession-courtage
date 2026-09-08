import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GROWTH_PLAN_ANNUAL_EUR } from "@/lib/billing/rates";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";

export const metadata: Metadata = {
  title: "Acquérir un portefeuille de courtage",
  description:
    "Le parcours de l’acquéreur : mandat d’achat, dossiers présentés par score d’adéquation, salle de données journalisée et garantie de rétention.",
};

const MANDATE_CRITERIA = [
  { label: "Compagnies", detail: "Celles que vous savez déjà gérer, et celles que vous refusez." },
  { label: "Branches", detail: "Santé, prévoyance, automobile, multirisque professionnelle, décennale." },
  { label: "Zone", detail: "National, une région, ou une liste de départements." },
  { label: "Commissions", detail: "La fourchette annuelle qui vous intéresse." },
  { label: "Budget", detail: "Votre plafond, et votre mode de financement." },
];

const SAFEGUARDS = [
  {
    title: "Vous savez ce que vous achetez avant de vous engager",
    body: "Le teaser donne la zone, la répartition par branche, le nombre de contrats, l’ancienneté moyenne et la fourchette de valorisation. La composition détaillée arrive avec le mémorandum, après signature de l’accord de confidentialité.",
  },
  {
    title: "La valorisation est vérifiable",
    body: "Vous ne recevez pas un multiple à prendre ou à laisser. Chaque coefficient de la cascade est affiché avec son impact en euros, et vous pouvez contester un poste sur des bases chiffrées pendant la négociation.",
  },
  {
    title: "Votre offre reste confidentielle",
    body: `Aucun autre candidat ne voit votre montant, et le cédant lui-même ne le découvre qu’à la clôture de la fenêtre de ${OFFER_WINDOW_DAYS} jours. Vous proposez ce que le dossier vaut pour vous, pas ce qu’il faut pour dépasser un concurrent.`,
  },
  {
    title: "La rétention est garantie par le contrat",
    body: "La part différée du prix est recalculée sur la rétention constatée à trois, six et douze mois. Si la clientèle part, vous ne payez pas le portefeuille que vous n’avez pas conservé.",
  },
];

export default function AcquerirPage() {
  return (
    <main>
      <section className="bg-charcoal text-cream">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-gold">
            Parcours acquéreur
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight">
            Croître par acquisition, sans acheter un portefeuille qui fond
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-cream/80">
            Vous déposez un mandat une fois. Les dossiers qui vous correspondent
            vous sont présentés avec leur score d’adéquation et le détail des
            critères qui ont joué.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="gold" size="lg">
              <Link href="/inscription">Déposer un mandat</Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-cream/25 bg-transparent text-cream hover:bg-cream/10"
            >
              <Link href="/annonces">Parcourir les annonces</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-ink">
              Votre mandat d’achat
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Plutôt que de surveiller un catalogue, vous décrivez une fois ce que
              vous cherchez. Chaque nouvelle annonce est confrontée à votre mandat,
              et vous êtes prévenu quand l’adéquation dépasse le seuil de mise en
              relation. Vous recevez au plus un message par jour, et aucun message
              quand rien ne correspond.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Un mandat exclusif vous donne une avance de 48 heures sur les autres
              acquéreurs pour les dossiers qui correspondent exactement à vos
              critères.
            </p>
          </div>
          <dl className="rounded-3xl border border-line bg-paper p-7">
            {MANDATE_CRITERIA.map((item, index) => (
              <div
                key={item.label}
                className={
                  index === 0
                    ? "flex flex-col gap-1 pb-4 sm:flex-row sm:gap-6"
                    : "flex flex-col gap-1 border-t border-line py-4 last:pb-0 sm:flex-row sm:gap-6"
                }
              >
                <dt className="w-36 shrink-0 text-[15px] font-medium text-ink">
                  {item.label}
                </dt>
                <dd className="text-[15px] leading-relaxed text-muted">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-serif text-3xl font-semibold text-ink">
            Quatre garanties avant de signer
          </h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {SAFEGUARDS.map((item) => (
              <article key={item.title} className="rounded-3xl border border-line bg-cream p-6">
                <h3 className="font-serif text-xl font-semibold text-ink">{item.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-line bg-paper p-8">
          <h2 className="font-serif text-2xl font-semibold text-ink">
            Ce que coûte le suivi de plusieurs dossiers
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">
            La consultation des annonces, le dépôt d’un mandat et la mise en relation
            sont gratuits. L’abonnement Croissance, à {GROWTH_PLAN_ANNUAL_EUR} € HT
            par an, lève la limite du nombre de dossiers suivis en parallèle et donne
            accès aux alertes prioritaires ainsi qu’au mandat exclusif.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="gold">
              <Link href="/inscription">Créer un compte acquéreur</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tarifs">Détail des tarifs</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
