import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FREE_PLAN_DEAL_QUOTA,
  GROWTH_PLAN_ANNUAL_EUR,
  SUCCESS_FEE_FLOOR_EUR,
  SUCCESS_FEE_RATE,
  successFeeFor,
} from "@/lib/billing/rates";
import { formatEuroWhole } from "@/lib/format/number";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Valorisation, annonce et mise en relation gratuites. Honoraires dus uniquement à la cession conclue.",
};

const FEE_LABEL = `${(SUCCESS_FEE_RATE * 100).toLocaleString("fr-FR")} % HT`;

const INCLUDED = [
  "Valorisation en cascade, détaillée poste par poste",
  "Publication de l’annonce sous alias",
  "Mise en relation avec les acquéreurs qualifiés",
  "Accord de confidentialité et mémorandum",
  "Salle de données avec journal des accès",
  "Suivi du dossier jusqu’au transfert ORIAS",
  "Rapports de rétention à trois, six et douze mois",
];

const EXAMPLES = [12000, 34000, 80000, 150000];

export default function TarifsPage() {
  return (
    <main>
      <section className="bg-charcoal text-cream">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-indigo-soft">
            Tarifs
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight">
            Vous ne payez que si vous cédez
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-cream/80">
            Aucun abonnement obligatoire pour le cédant, aucun frais de dossier,
            aucune commission sur une opération qui ne se fait pas.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-gold-deep/40 bg-gold/10 p-8">
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold-deep">
              Cédant
            </p>
            <p className="tabular mt-4 font-serif text-5xl font-semibold text-ink">
              {FEE_LABEL}
            </p>
            <p className="mt-2 text-[15px] text-muted">
              Prélevés sur le prix de cession, à la vente conclue uniquement.
            </p>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              Tout ce qui précède la vente est gratuit et sans engagement. Si vous
              renoncez, si aucune offre ne vous convient, ou si vous retirez votre
              annonce, vous ne devez rien. Un plancher de{" "}
              {formatEuroWhole(SUCCESS_FEE_FLOOR_EUR)} s’applique sur les très
              petits dossiers.
            </p>
            <Button asChild variant="gold" className="mt-7">
              <Link href="/inscription">Ouvrir un compte cédant</Link>
            </Button>
          </article>

          <article className="rounded-3xl border border-line bg-paper p-8">
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold-deep">
              Acquéreur
            </p>
            <p className="tabular mt-4 font-serif text-5xl font-semibold text-ink">
              {GROWTH_PLAN_ANNUAL_EUR} € HT
            </p>
            <p className="mt-2 text-[15px] text-muted">
              Par an, forfait Croissance. Sans engagement de durée.
            </p>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              La consultation des annonces, le dépôt d’un mandat et la mise en
              relation restent gratuits, dans la limite de {FREE_PLAN_DEAL_QUOTA}{" "}
              dossiers suivis en parallèle. Le forfait Croissance lève cette limite
              et donne accès aux alertes prioritaires ainsi qu’au mandat exclusif,
              avec 48 heures d’avance sur les dossiers correspondants.
            </p>
            <Button asChild variant="outline" className="mt-7">
              <Link href="/inscription">Ouvrir un compte acquéreur</Link>
            </Button>
          </article>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-serif text-3xl font-semibold text-ink">
            Ce que les honoraires couvrent
          </h2>
          <ul className="mt-6 grid gap-3 lg:grid-cols-2">
            {INCLUDED.map((item) => (
              <li
                key={item}
                className="rounded-3xl border border-line bg-cream px-5 py-4 text-[15px] text-ink"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[15px] leading-relaxed text-muted">
            Aucun prestataire externe n’est facturé en supplément. La vérification
            d’identité, la signature électronique et le séquestre sont intégrés au
            parcours.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-serif text-3xl font-semibold text-ink">
          Exemples de calcul
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] text-muted">
          Montants hors taxes, dus à la signature de l’acte de cession.
        </p>
        <div className="mt-7 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-3 pr-4 text-[15px] font-semibold text-ink">
                  Prix de cession
                </th>
                <th scope="col" className="py-3 pr-4 text-right text-[15px] font-semibold text-ink">
                  Honoraires
                </th>
                <th scope="col" className="py-3 text-right text-[15px] font-semibold text-ink">
                  Net cédant
                </th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLES.map((price) => {
                const fee = successFeeFor(price);
                return (
                  <tr key={price} className="border-b border-line">
                    <td className="tabular py-4 pr-4 text-[15px] text-ink">
                      {formatEuroWhole(price)}
                    </td>
                    <td className="tabular py-4 pr-4 text-right text-[15px] text-ink">
                      {formatEuroWhole(fee)}
                    </td>
                    <td className="tabular py-4 text-right text-[15px] font-medium text-ink">
                      {formatEuroWhole(price - fee)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild variant="gold" size="lg">
            <Link href="/valoriser">Estimer mon portefeuille</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/ceder">Parcours cédant</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
