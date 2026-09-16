import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/page-intro";
import {
  CTA_SELL,
  MARKET_ACCESS,
  NAV_SELL,
  NO_FEE_LABEL,
  PRICE_RULE,
  SELL_PILLARS,
  STUDY_SENTENCE,
} from "@/lib/copy/market";
import { INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";
import { OFFER_WINDOW_DAYS } from "@/lib/listing/constants";

export const metadata: Metadata = {
  title: "Céder un portefeuille de courtage",
  description:
    "Le parcours du cédant : création du compte, import du portefeuille, étude par notre équipe, mise en ligne de l’annonce au prix fixé, séance d’offres, paiement sécurisé et transfert.",
};

const PROTECTIONS = [
  {
    title: "Votre nom n’apparaît nulle part",
    body: "Votre annonce est mise en ligne sous un numéro de dossier. Ni raison sociale, ni adresse, ni commune : la zone affichée reste au niveau du département ou de la région. Vos concurrents, vos mandants et vos collaborateurs ne peuvent pas vous reconnaître.",
  },
  {
    title: "Les candidats restent anonymes",
    body: `Pendant les ${OFFER_WINDOW_DAYS} jours de la séance, les acquéreurs voient la meilleure offre et le nombre d’offres, jamais l’identité des autres candidats.`,
  },
  {
    title: "Vous décidez à la clôture",
    body: "Vous suivez les offres au fil de la séance, mais vous ne retenez qu’à sa clôture : vous comparez toutes les propositions avant de choisir.",
  },
  {
    title: "Vous restez libre de refuser",
    body: "La plateforme n’adjuge pas. Vous choisissez l’acquéreur, et vous pouvez écarter une offre sans avoir à vous en expliquer.",
  },
];

const TIMELINE = [
  {
    title: "Création du compte",
    body: "Vous créez votre compte cédant.",
  },
  {
    title: "Import du portefeuille",
    body: "Vous déposez le fichier de votre portefeuille, au format CSV ou XLSX.",
  },
  {
    title: "Étude du portefeuille",
    body: STUDY_SENTENCE,
  },
  {
    title: "Mise en ligne de l’annonce",
    body: PRICE_RULE,
  },
  {
    title: "Séance d’offres",
    body: `La séance dure ${OFFER_WINDOW_DAYS} jours. Vous suivez les candidats et les offres qui arrivent.`,
  },
  {
    title: "Choix de l’acquéreur",
    body: "À la clôture, vous comparez les offres et vous choisissez celle qui vous convient.",
  },
  {
    title: "Signature et transfert",
    body: `Les actes sont contrôlés par nos avocats et signés en ligne, puis les contrats sont transférés. Votre identité n’est révélée qu’à l’acquéreur qui a versé un dépôt de ${INTEREST_DEPOSIT_LABEL} du prix.`,
  },
];

export default function CederPage() {
  return (
    <main>
      <PageIntro kicker="Vendre" title={NAV_SELL}>
        {STUDY_SENTENCE}
      </PageIntro>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-5 sm:grid-cols-2">
          {SELL_PILLARS.map((item) => (
            <article key={item.title} className="rounded-2xl border border-line bg-paper p-6">
              <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-muted">
          * Délai constaté sur les cessions accompagnées. Il ne constitue pas une
          garantie de délai.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
            <div className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl border border-line bg-paper p-7">
                <p className="text-[13px] font-semibold text-indigo">Option 1</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">Annonce simple</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  Vous renseignez les informations principales. Nous ne
                  contrôlons pas le Kbis, la pièce d’identité ni les bordereaux
                  du dossier. Mise en vente gratuite, paiement sécurisé.
                </p>
                <Button asChild variant="primary" className="mt-6">
                  <Link href="/inscription?voie=annonce">Déposer une annonce</Link>
                </Button>
              </article>
              <article className="rounded-2xl border border-line bg-paper p-7">
                <p className="text-[13px] font-semibold text-indigo">Option 2</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">
                  Certification
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  Nous contrôlons la société (Kbis), l’identité du représentant,
                  le justificatif ORIAS du dossier et les documents du
                  portefeuille. Honoraires précisés dans le contrat d’intermédiation, dus
                  seulement si la vente aboutit. Paiement sécurisé jusqu’au transfert.
                </p>
                <Button asChild variant="primary" className="mt-6">
                  <Link href="/inscription?voie=certifie">Faire certifier mon portefeuille</Link>
                </Button>
              </article>
            </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold tracking-tight text-ink">
          Quatre protections pendant la mise en vente
        </h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {PROTECTIONS.map((item) => (
            <article key={item.title} className="rounded-2xl border border-line bg-paper p-6">
              <h3 className="text-xl font-semibold text-ink">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight text-ink">
            Le déroulé, étape par étape
          </h2>
          <ol className="mt-8 space-y-3">
            {TIMELINE.map((item, index) => (
              <li
                key={item.title}
                className="flex gap-5 rounded-2xl border border-line bg-paper p-6"
              >
                <span className="tabular shrink-0 text-2xl font-bold text-indigo">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl border border-line bg-paper p-8">
          <p className="text-[13px] font-semibold text-indigo">
            Après la signature
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink">
            Un paiement sécurisé, du début à la fin
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">
            L’acquéreur paie le prix sur un compte sécurisé. L’argent vous est versé dès que les compagnies ont accepté le
            transfert des contrats. La mise en vente est {NO_FEE_LABEL.toLowerCase()}.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/inscription">{CTA_SELL}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tarifs">{MARKET_ACCESS}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
