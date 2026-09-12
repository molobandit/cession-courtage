import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { TestModeNotice } from "@/components/billing/test-mode-notice";
import { stripeMode } from "@/lib/billing/stripe";
import { getActor, isOriasVerified } from "@/lib/authz";
import { hasContactSubscription } from "@/lib/billing/contact-access";
import {
  GROWTH_PLAN_ANNUAL_EUR,
  INTEREST_DEPOSIT_LABEL,
  SIMPLE_FEE_LABEL,
  SUCCESS_FEE_FLOOR_EUR,
  VERIFIED_FEE_RANGE_LABEL,
  VERIFIED_FEE_RATE_MAX,
  VERIFIED_FEE_RATE_MIN,
  interestDepositFor,
  successFeeFor,
} from "@/lib/billing/rates";
import { formatEuroWhole } from "@/lib/format/number";
import { safeInternalPath } from "@/lib/nav/safe-next";
import { CERTIFIED_BADGE, CERTIFIED_LABEL } from "@/lib/site";
import {
  ACCESS_MARKET_POINTS,
  ACCESS_PRICE_LINE,
  CTA_BROWSE,
  CTA_SELL,
  MARKET_ACCESS,
  NO_FEE_LABEL,
  TAKE_POSITION,
} from "@/lib/copy/market";

export const metadata: Metadata = {
  title: MARKET_ACCESS,
  description: `Mettre en vente : ${NO_FEE_LABEL.toLowerCase()}. Accès au marché ${GROWTH_PLAN_ANNUAL_EUR} € HT par an.`,
};

const EXAMPLES = [12_000, 34_000, 80_000, 150_000];

const PLAN_ROWS: { label: string; free: boolean; paid: boolean }[] = [
  { label: "Consulter la salle de marché", free: true, paid: true },
  { label: "Mettre un portefeuille en vente", free: true, paid: true },
  { label: "Détail pour se positionner", free: false, paid: true },
  { label: "Contact et messages", free: false, paid: true },
  { label: "Dépôt d’offre", free: false, paid: true },
  { label: `Identité du vendeur (dépôt ${INTEREST_DEPOSIT_LABEL})`, free: false, paid: false },
];

const COMPARE_ROWS: {
  label: string;
  simple: string;
  verified: string;
}[] = [
  { label: "Publication sous alias", simple: "oui", verified: "oui" },
  { label: "Numéro ORIAS contrôlé à l’inscription", simple: "oui", verified: "oui" },
  { label: "Paiement via séquestre", simple: "oui", verified: "oui" },
  { label: "Kbis et existence réelle de la société", simple: "non", verified: "oui" },
  { label: "Pièce d’identité du représentant", simple: "non", verified: "oui" },
  { label: "Justificatif ORIAS du dossier", simple: "non", verified: "oui" },
  { label: "États de portefeuille et bordereaux", simple: "non", verified: "oui" },
  { label: "Badge en salle de marché", simple: "Non certifié", verified: CERTIFIED_LABEL },
  {
    label: "Honoraires si la vente aboutit",
    simple: SIMPLE_FEE_LABEL,
    verified: VERIFIED_FEE_RANGE_LABEL,
  },
];

const VERIFIED_PILLS = [
  "Société réelle : Kbis et RCS",
  "Identité du représentant",
  "Justificatif ORIAS du dossier",
  "Statuts et documents sociaux",
  "États de portefeuille",
  "Bordereaux de commissions",
  "Revue interne compagnies et mix",
  "Séquestre jusqu’à la prise de possession",
];

const VERIFY_BLOCKS = [
  {
    title: "La société",
    lede: "Nous contrôlons que le cabinet existe et qu’il est en règle pour céder.",
    items: [
      "Extrait Kbis ou justificatif d’immatriculation",
      "Informations légales (dénomination, siège, représentant)",
      "Statuts ou documents juridiques pertinents",
      "Justificatif ORIAS associé au dossier",
    ],
  },
  {
    title: "La personne",
    lede: "Nous contrôlons l’identité de celui qui signe, pas seulement le numéro ORIAS du compte.",
    items: [
      "Pièce d’identité du représentant légal",
      "Concordance avec le Kbis",
      "Les deux parties du dossier passent par cette étape avant l’acte",
      "Les pièces ne sont jamais publiées en salle de marché",
    ],
  },
  {
    title: "Le portefeuille",
    lede: "Nous confrontons ce qui est annoncé aux documents du cabinet.",
    items: [
      "États de portefeuille",
      "Bordereaux et relevés de commissions",
      "Relevés des compagnies, le cas échéant",
      "Répartition des contrats, renouvellement et résiliation",
    ],
  },
];

const FAQ = [
  {
    q: "Que donne l’abonnement ?",
    a: `Pour ${formatEuroWhole(GROWTH_PLAN_ANNUAL_EUR)} HT par an, réglé par carte via Stripe. Vous accédez au détail de l’offre : contact, messages et dépôt d’offre. Ce n’est pas une vérification du portefeuille. Le vendeur reste anonyme à cette étape.`,
  },
  {
    q: "Quelle est la différence entre l’abonnement, le dépôt et la vérification ?",
    a: `L’abonnement ouvre le contact. Le dépôt de ${INTEREST_DEPOSIT_LABEL} révèle qui est le cédant et ouvre les PDF du cabinet. La vérification (option 2) contrôle la société, les pièces d’identité et les documents du portefeuille. Ce sont trois étapes distinctes.`,
  },
  {
    q: "Que contrôlez-vous concrètement ?",
    a: "Sur l’option vérifiée : Kbis et existence de la société, pièce d’identité du représentant, justificatif ORIAS du dossier, états de portefeuille et bordereaux de commissions. L’annonce simple repose sur les données déclarées. Dans les deux cas, le numéro ORIAS est contrôlé à l’inscription.",
  },
  {
    q: "Quand le vendeur est-il identifié ?",
    a: `Après un dépôt de ${INTEREST_DEPOSIT_LABEL} du prix demandé. Avant cela, le cédant reste sous alias, même si vous êtes abonné, et même si le portefeuille est vérifié.`,
  },
  {
    q: "Combien coûte une vente ?",
    a: `L’annonce simple est à ${SIMPLE_FEE_LABEL} de commission. L’option vérifiée est à ${VERIFIED_FEE_RANGE_LABEL}, uniquement si la vente aboutit. Plancher de ${formatEuroWhole(SUCCESS_FEE_FLOOR_EUR)} sur les très petits dossiers vérifiés. Le séquestre est inclus, sans frais supplémentaires.`,
  },
  {
    q: "Quand l’argent est-il débloqué ?",
    a: "Les fonds de cession restent sous séquestre jusqu’à ce que l’acquéreur ait le portefeuille en sa possession. Si la vente n’aboutit pas, le dépôt d’intérêt et les fonds consignés sont restitués. L’abonnement annuel de 250 € HT se règle par Stripe.",
  },
];

export default async function TarifsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const annual = formatEuroWhole(GROWTH_PLAN_ANNUAL_EUR);
  const actor = await getActor();
  const { next: nextRaw } = await searchParams;
  const next = safeInternalPath(nextRaw);
  const subscribed = Boolean(actor && (await hasContactSubscription(actor)));
  const canPay = Boolean(actor && isOriasVerified(actor) && !subscribed);

  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-soft via-page to-page">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <p className="inline-flex rounded-full border border-indigo-line bg-surface px-3.5 py-1 text-[12px] font-semibold text-indigo">
            {MARKET_ACCESS}
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {TAKE_POSITION}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
            Accès à toutes les opportunités de portefeuille. {ACCESS_PRICE_LINE}.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#abonnements"
              className="rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm hover:border-indigo"
            >
              {MARKET_ACCESS}
            </a>
            <a
              href="#verification"
              className="rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm hover:border-indigo"
            >
              Ce que nous vérifions
            </a>
            <a
              href="#services"
              className="rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm hover:border-indigo"
            >
              Cession et séquestre
            </a>
            <Link
              href="/annonces"
              className="rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink shadow-sm hover:border-indigo"
            >
              {CTA_BROWSE}
            </Link>
          </div>
        </div>
      </section>

      <section id="abonnements" className="bg-page pb-6 pt-4">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <p className="inline-flex rounded-full bg-indigo-soft px-3.5 py-1 text-[12px] font-semibold text-indigo">
            Plans
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {MARKET_ACCESS}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted">
            {ACCESS_MARKET_POINTS[0]} {ACCESS_MARKET_POINTS[1]}
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl items-stretch gap-6 px-4 pb-16 lg:grid-cols-2">
          <article className="flex flex-col rounded-3xl border border-line bg-surface p-8 shadow-sm">
            <h3 className="text-center text-xl font-bold text-ink">{NO_FEE_LABEL}</h3>
            <p className="mt-4 text-center text-[15px] font-semibold text-ink">
              Mise en vente sans frais
            </p>
            <p className="mt-1 text-center text-[13px] text-muted">Aucun abonnement requis pour céder</p>
            <ul className="mt-8 flex-1 space-y-3">
              {PLAN_ROWS.map((row) => (
                <PlanRow key={row.label} label={row.label} on={row.free} />
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-8 w-full" size="lg">
              <Link href="/ceder">{CTA_SELL}</Link>
            </Button>
            <p className="mt-3 text-center text-[12px] text-muted">
              Sans carte. Sans frais de mise en vente.
            </p>
          </article>

          <article className="relative flex flex-col rounded-3xl border-2 border-indigo bg-indigo-soft/60 p-8 shadow-sm">
            <p className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo px-3 py-1 text-[12px] font-semibold text-white">
              Recommandé
            </p>
            <h3 className="text-center text-xl font-bold text-ink">Abonnement annuel</h3>
            <p className="tabular mt-4 text-center text-5xl font-bold tracking-tight text-indigo">
              {GROWTH_PLAN_ANNUAL_EUR.toLocaleString("fr-FR")}
              <span className="ml-1 text-[1.35rem]">€</span>
              <span className="ml-1 align-top text-base font-semibold text-indigo/70">HT</span>
            </p>
            <p className="mt-1 text-center text-[13px] text-muted">{annual} HT par an</p>
            <ul className="mt-8 flex-1 space-y-3">
              {PLAN_ROWS.map((row) => (
                <PlanRow key={row.label} label={row.label} on={row.paid} accent />
              ))}
            </ul>
            {subscribed ? (
              <Button asChild variant="primary" className="mt-8 w-full" size="lg">
                <Link href="/app/profil">Abonnement actif</Link>
              </Button>
            ) : canPay ? (
              <>
                <SubscribeButton className="mt-8" label="Payer 250 € HT" next={next ?? undefined} />
                {stripeMode() === "test" ? <TestModeNotice /> : null}
              </>
            ) : (
              <Button asChild variant="primary" className="mt-8 w-full" size="lg">
                <Link
                  href={
                    actor
                      ? isOriasVerified(actor)
                        ? next
                          ? `/app/profil?next=${encodeURIComponent(next)}#factures`
                          : "/app/profil#factures"
                        : "/en-attente-orias"
                      : `/connexion?next=${encodeURIComponent(next ? `/tarifs?next=${encodeURIComponent(next)}#abonnements` : "/tarifs#abonnements")}`
                  }
                >
                  {actor ? "Continuer vers le paiement" : "Se connecter pour s’abonner"}
                </Link>
              </Button>
            )}
            <p className="mt-3 text-center text-[12px] text-muted">
              Paiement sécurisé Stripe. 250 € HT par an. Renouvellement annuel.
            </p>
          </article>
        </div>
      </section>

      <section id="verification" className="border-t border-line bg-page">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <p className="inline-flex rounded-full bg-indigo-soft px-3.5 py-1 text-[12px] font-semibold text-indigo">
              Vérification
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Ce que nous contrôlons, et ce que nous ne contrôlons pas
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted">
              L’abonnement n’est pas une vérification. L’annonce simple publie
              les données déclarées. L’option vérifiée contrôle la société, la
              personne et le portefeuille.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-3xl border border-line bg-surface">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead className="bg-page">
                <tr>
                  <th scope="col" className="px-5 py-4 text-[14px] font-semibold text-ink">
                    Contrôle
                  </th>
                  <th scope="col" className="px-5 py-4 text-center text-[14px] font-semibold text-ink">
                    Annonce simple
                  </th>
                  <th scope="col" className="px-5 py-4 text-center text-[14px] font-semibold text-ink">
                    Portefeuille vérifié
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <th
                      scope="row"
                      className="px-5 py-3.5 text-[14px] font-medium text-ink"
                    >
                      {row.label}
                    </th>
                    <td className="px-5 py-3.5 text-center text-[14px]">
                      <CompareValue value={row.simple} />
                    </td>
                    <td className="px-5 py-3.5 text-center text-[14px]">
                      <CompareValue value={row.verified} accent />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-center text-[13px] text-muted">
            Le numéro ORIAS est contrôlé pour tous les comptes. Sur l’annonce
            simple, nous ne relisons pas le Kbis, la pièce d’identité ni les
            bordereaux du dossier.
          </p>

          <article
            id="services"
            className="mt-12 rounded-3xl bg-gradient-to-br from-indigo via-indigo-mid to-indigo-dark p-8 text-white shadow-sm sm:p-10"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold">
                  Option 2 · {CERTIFIED_LABEL}
                </p>
                <h3 className="mt-4 text-2xl font-bold tracking-tight">
                  Portefeuille vérifié
                </h3>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/80">
                  Contrôle de la société (souvent appelé KYB), de l’identité du
                  représentant (KYC) et des documents du portefeuille. Honoraires
                  dus uniquement si la vente aboutit. La salle de marché affiche{" "}
                  {CERTIFIED_BADGE}.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular text-4xl font-bold sm:text-5xl">
                  {VERIFIED_FEE_RANGE_LABEL}
                </p>
                <p className="mt-1 text-[13px] text-white/70">
                  Plancher {formatEuroWhole(SUCCESS_FEE_FLOOR_EUR)}
                </p>
              </div>
            </div>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {VERIFIED_PILLS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[14px] leading-snug"
                >
                  <CheckIcon className="mt-0.5 shrink-0 text-white" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button asChild className="bg-white !text-indigo hover:bg-white/90" size="lg">
                <Link href="/certification">Voir le détail des pièces</Link>
              </Button>
            </div>
          </article>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {VERIFY_BLOCKS.map((block) => (
              <article
                key={block.title}
                className="flex flex-col rounded-3xl border border-line bg-surface p-7 shadow-sm"
              >
                <h3 className="text-lg font-bold text-ink">{block.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{block.lede}</p>
                <ul className="mt-5 space-y-2">
                  {block.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[14px] text-ink">
                      <CheckIcon className="mt-0.5 shrink-0 text-indigo" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <ServiceCard
              title="Dépôt identité"
              lede="Ce versement révèle le cédant. Ce n’est pas le contrôle des pièces."
              price={INTEREST_DEPOSIT_LABEL}
              items={[
                "Calculé sur le prix demandé",
                "Dévoile les coordonnées du cédant",
                "Messagerie anonyme avant le dépôt",
                "Même un portefeuille vérifié reste sous alias jusqu’ici",
              ]}
            />
            <ServiceCard
              title="Annonce simple"
              lede="Le portefeuille est présenté tel que déclaré, sans relecture des pièces."
              price={SIMPLE_FEE_LABEL}
              items={[
                "Aucune commission sur la vente",
                "Pas de Kbis, pièce d’identité ni bordereaux contrôlés",
                "Statut non certifié en salle de marché",
                "Paiement via séquestre, comme l’option 2",
              ]}
              href="/ceder"
              cta="Choisir l’annonce simple"
            />
            <ServiceCard
              title="Séquestre"
              lede="Les fonds ne vont jamais directement de l’acheteur au vendeur."
              price="Inclus"
              items={[
                "Consignation jusqu’à la remise du portefeuille",
                "Déblocage à la prise de possession",
                "Restitution à l’acquéreur si la vente n’aboutit pas",
                "Aucun frais de séquestre en plus des honoraires",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">Exemples</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] text-muted">
            Dépôt de {INTEREST_DEPOSIT_LABEL} pour révéler le cédant. Honoraires
            de l’option 2 uniquement si la vente aboutit. Séquestre inclus.
          </p>
          <div className="mt-8 overflow-hidden rounded-3xl border border-line">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead className="bg-page">
                <tr>
                  <th scope="col" className="px-5 py-4 text-[14px] font-semibold text-ink">
                    Prix demandé
                  </th>
                  <th scope="col" className="px-5 py-4 text-right text-[14px] font-semibold text-ink">
                    Dépôt {INTEREST_DEPOSIT_LABEL}
                  </th>
                  <th scope="col" className="px-5 py-4 text-right text-[14px] font-semibold text-ink">
                    Honoraires {(VERIFIED_FEE_RATE_MIN * 100).toLocaleString("fr-FR")} %
                  </th>
                  <th scope="col" className="px-5 py-4 text-right text-[14px] font-semibold text-ink">
                    Honoraires {(VERIFIED_FEE_RATE_MAX * 100).toLocaleString("fr-FR")} %
                  </th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLES.map((price) => (
                  <tr key={price} className="border-t border-line">
                    <td className="tabular px-5 py-4 text-[15px] font-medium text-ink">
                      {formatEuroWhole(price)}
                    </td>
                    <td className="tabular px-5 py-4 text-right text-[15px] text-ink">
                      {formatEuroWhole(interestDepositFor(price))}
                    </td>
                    <td className="tabular px-5 py-4 text-right text-[15px] text-ink">
                      {formatEuroWhole(successFeeFor(price, VERIFIED_FEE_RATE_MIN))}
                    </td>
                    <td className="tabular px-5 py-4 text-right text-[15px] text-ink">
                      {formatEuroWhole(successFeeFor(price, VERIFIED_FEE_RATE_MAX))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-page">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-ink">
            Questions fréquentes
          </h2>
          <p className="mt-3 text-center text-[15px] text-muted">
            Ce que coûte le service, et à quel moment.
          </p>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-line bg-surface p-5 open:border-indigo-line"
              >
                <summary className="cursor-pointer list-none text-[15px] font-medium text-ink">
                  <span className="flex items-start justify-between gap-4">
                    {item.q}
                    <span aria-hidden="true" className="text-indigo group-open:hidden">
                      +
                    </span>
                    <span aria-hidden="true" className="hidden text-indigo group-open:inline">
                      −
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-indigo-soft">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink">
            Prêt à publier ou à vous abonner ?
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Déposez une annonce sans frais, ou ouvrez l’accès au détail de
            l’offre. Aucun paiement réel en démo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/ceder">Déposer une annonce</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/inscription">S’abonner</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function CompareValue({
  value,
  accent = false,
}: {
  value: string;
  accent?: boolean;
}) {
  if (value === "oui") {
    return (
      <span className="inline-flex items-center justify-center gap-1 font-medium text-ink">
        <CheckIcon className={accent ? "text-indigo" : "text-ok"} />
        oui
      </span>
    );
  }
  if (value === "non") {
    return <span className="text-muted">non</span>;
  }
  return (
    <span className={`font-medium ${accent ? "text-indigo" : "text-ink"}`}>
      {value}
    </span>
  );
}

function PlanRow({
  label,
  on,
  accent = false,
}: {
  label: string;
  on: boolean;
  accent?: boolean;
}) {
  return (
    <li className="flex items-start gap-3 text-[14px] leading-snug text-ink">
      {on ? (
        <CheckIcon className={accent ? "mt-0.5 text-indigo" : "mt-0.5 text-ok"} />
      ) : (
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-alt text-[11px] text-muted">
          –
        </span>
      )}
      <span>
        {label}
        {!on ? <span className="text-muted"> : non</span> : null}
      </span>
    </li>
  );
}

function ServiceCard({
  title,
  lede,
  price,
  items,
  href,
  cta,
}: {
  title: string;
  lede: string;
  price: string;
  items: string[];
  href?: string;
  cta?: string;
}) {
  return (
    <article className="flex flex-col rounded-3xl border border-line bg-surface p-7 shadow-sm">
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{lede}</p>
      <p className="tabular mt-4 text-2xl font-bold text-indigo">{price}</p>
      <ul className="mt-5 flex-1 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[14px] text-ink">
            <CheckIcon className="mt-0.5 shrink-0 text-indigo" />
            {item}
          </li>
        ))}
      </ul>
      {href && cta ? (
        <Button asChild variant="outline" className="mt-6">
          <Link href={href}>{cta}</Link>
        </Button>
      ) : null}
    </article>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 ${className ?? ""}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" />
      <path
        d="M6 10.2 8.6 13 14 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
