import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/page-intro";
import {
  CERTIFIED_CONTROLLED_ELEMENTS,
  CTA_SELL,
  MARKET_ACCESS,
  NAV_SELL,
  NO_FEE_LABEL,
  RETENTION_TRUST_BODY,
  RETENTION_TRUST_TITLE,
  SELL_PILLARS,
  STUDY_SENTENCE,
  TRANSACTION_SECURE_BODY,
  TRANSACTION_SECURE_TITLE,
} from "@/lib/copy/market";
import { INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";

export const metadata: Metadata = {
  title: "Céder un portefeuille de courtage",
  description:
    "Le parcours du cédant : création du compte, import du portefeuille, étude par notre équipe, mise en ligne de l’annonce, séance d’offres, transaction sécurisée et transfert.",
};

const PROTECTIONS = [
  {
    title: "Votre nom n’apparaît nulle part",
    body: "Votre annonce est mise en ligne sous un numéro de dossier. Ni raison sociale, ni adresse, ni commune : la zone affichée reste au niveau du département ou de la région. Vos concurrents, vos mandants et vos collaborateurs ne peuvent pas vous reconnaître.",
  },
  {
    title: "Les candidats restent anonymes",
    body: "Pendant la séance, les acquéreurs voient la meilleure offre et le nombre d’offres, jamais l’identité des autres candidats.",
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

const TIMELINE: { title: string; body: string; details?: string[] }[] = [
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
    body: "Tous les éléments suivants sont contrôlés. Une fois la valeur déterminée, l’annonce est mise en ligne avec le montant correspondant.",
    details: [...CERTIFIED_CONTROLLED_ELEMENTS],
  },
  {
    title: "Séance d’offres",
    body: "Vous suivez les candidats et les offres tout au long de la séance.",
  },
  {
    title: "Choix de l’acquéreur",
    body: "À la clôture, vous comparez les offres et vous choisissez celle qui vous convient.",
  },
  {
    title: "Signature et transfert",
    body: `Les actes sont contrôlés par nos avocats et signés en ligne, puis les contrats sont transférés. Dès que l’acquéreur se positionne, il verse un dépôt de ${INTEREST_DEPOSIT_LABEL} dans un trust, pour lancer la procédure de cession.`,
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
                  Annonce non certifiée. Les données du portefeuille ne sont pas
                  vérifiées par La bourse du portefeuille. C’est à l’acquéreur
                  d’effectuer ses propres vérifications, notamment le Kbis, les
                  pièces d’identité et la capacité du vendeur. Transaction
                  sécurisée.
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
                  Portefeuille certifié. Tous les éléments sont contrôlés. Les
                  données et les bordereaux de commission sont vérifiés, ainsi
                  que le reste du dossier. Honoraires précisés dans le contrat
                  d’intermédiation, dus seulement si la vente aboutit. Transaction
                  sécurisée.
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
                  {item.details ? (
                    <ul className="mt-3 grid gap-1 text-[15px] leading-relaxed text-muted sm:grid-cols-2">
                      {item.details.map((detail) => (
                        <li key={detail} className="rounded-xl bg-page px-3 py-2 text-ink">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  ) : null}
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
            {TRANSACTION_SECURE_TITLE}
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">
            {TRANSACTION_SECURE_BODY} La mise en vente est {NO_FEE_LABEL.toLowerCase()}.
          </p>
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-paper p-8">
          <p className="text-[13px] font-semibold text-indigo">Conservation</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink">
            {RETENTION_TRUST_TITLE}
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">
            {RETENTION_TRUST_BODY}
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
