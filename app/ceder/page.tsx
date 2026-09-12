import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/page-intro";
import {
  CTA_SELL,
  MARKET_ACCESS,
  NAV_SELL,
  NO_FEE_LABEL,
  SELL_PILLARS,
} from "@/lib/copy/market";
import { INTEREST_DEPOSIT_LABEL, SIMPLE_FEE_LABEL, VERIFIED_FEE_RANGE_LABEL } from "@/lib/billing/rates";
import { ASKING_MAX, ASKING_MIN, OFFER_WINDOW_DAYS } from "@/lib/listing/constants";
import { formatEuroWhole } from "@/lib/format/number";

export const metadata: Metadata = {
  title: "Céder un portefeuille de courtage",
  description:
    "Le parcours du cédant : import anonymisé, valorisation en cascade, annonce sous alias, offres scellées et transfert ORIAS accompagné.",
};

const PROTECTIONS = [
  {
    title: "Votre nom n’apparaît nulle part",
    body: "Votre annonce est publiée sous un alias numéroté. Ni raison sociale, ni adresse, ni commune. La zone affichée reste au niveau du département ou de la région. Vos concurrents, vos mandants et vos collaborateurs ne peuvent pas vous reconnaître.",
  },
  {
    title: "Les candidats ne se voient pas entre eux",
    body: `Pendant les ${OFFER_WINDOW_DAYS} jours de la fenêtre, aucun acquéreur ne sait combien les autres proposent, ni même s’il y en a d’autres. Aucune surenchère en direct, aucune prolongation automatique.`,
  },
  {
    title: "Vous ne voyez rien non plus avant la clôture",
    body: "Les montants vous sont masqués tant que la fenêtre est ouverte. Cette règle s’applique au niveau des requêtes, pas seulement à l’affichage. Elle vous protège d’une décision prise trop tôt sur la première proposition venue.",
  },
  {
    title: "Vous restez libre de refuser",
    body: "La plateforme n’adjuge pas. À la clôture, vous voyez toutes les propositions en même temps et vous décidez seul. Vous pouvez écarter la mieux-disante sans avoir à vous en expliquer.",
  },
];

const TIMELINE = [
  {
    title: "Import du portefeuille",
    body: "Vous déposez un bordereau CSV ou XLSX. Les colonnes nominatives sont refusées, les séparateurs et les encodages usuels sont reconnus, et vous validez la correspondance des colonnes avant tout enregistrement.",
  },
  {
    title: "Valorisation en cascade",
    body: "Sept coefficients successifs corrigent la valeur brute issue des multiples par branche. Chacun est affiché avec son impact chiffré, et la plateforme vous indique les correctifs les plus rentables.",
  },
  {
    title: "Publication sous alias",
    body: `Vous fixez un prix demandé entre ${formatEuroWhole(ASKING_MIN)} et ${formatEuroWhole(ASKING_MAX)}. Vous pouvez ne céder qu’une partie de votre portefeuille en sélectionnant les lignes concernées, la fourchette est alors recalculée sur ce sous-ensemble.`,
  },
  {
    title: "Fenêtre d’offres",
    body: `La fenêtre dure ${OFFER_WINDOW_DAYS} jours à compter de la publication. Vous suivez pendant ce temps le nombre de consultations du teaser et les accords de confidentialité signés, sans voir les montants.`,
  },
  {
    title: "Choix de l’acquéreur",
    body: "À la clôture, les propositions s’ouvrent toutes en même temps, avec l’alias de chaque candidat, le montant, la part comptant et le message d’intention.",
  },
  {
    title: "Dossier et transfert",
    body: `Accord de confidentialité, mémorandum, salle de données, lettre d’intention, protocole, signature, séquestre, puis transfert ORIAS. Votre identité n’est révélée qu’après le dépôt de ${INTEREST_DEPOSIT_LABEL} du prix.`,
  },
];

export default function CederPage() {
  return (
    <main>
      <PageIntro kicker="Vendre" title={NAV_SELL}>
        Valorisez et cédez votre portefeuille dans un cadre sécurisé.
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
                  du dossier. Aucune commission sur la vente. Le paiement
                  transite quand même par le séquestre.
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
                  portefeuille. Honoraires de {VERIFIED_FEE_RANGE_LABEL} si la
                  vente aboutit. Séquestre jusqu’à la prise de possession.
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
            Après la cession
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink">
            La part différée s’ajuste sur la rétention constatée
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">
            Un acquéreur accepte rarement de tout payer comptant, parce qu’il porte
            seul le risque que la clientèle parte après votre départ. Nous mesurons
            la rétention à trois, six et douze mois. La part différée est recalculée
            sur le taux réellement observé, rapporté à une cible de 90 %, et ne peut
            pas descendre en dessous de la moitié du montant convenu. Vous savez dès
            la signature ce que vous risquez au pire, et l’acquéreur accepte une part
            comptant plus élevée parce qu’il est couvert.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Publier : {NO_FEE_LABEL.toLowerCase()}. Option 1 : {SIMPLE_FEE_LABEL} de commission.
            Option 2 : {VERIFIED_FEE_RANGE_LABEL} après vérification. Le paiement
            passe par le Trust dans les deux cas.
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
