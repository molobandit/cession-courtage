import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/page-intro";
import { BUY_POINTS, CTA_BROWSE, MARKET_ACCESS, NAV_BUY, PRICE_RULE_SENTENCES, RETENTION_TRUST_BODY, RETENTION_TRUST_TITLE, STUDY_SENTENCE } from "@/lib/copy/market";
import { canBuy, getActor, isOriasVerified } from "@/lib/authz";
import { INTEREST_DEPOSIT_LABEL } from "@/lib/billing/rates";
import { ACQUISITION_APP_PATH, acquisitionLoginHref } from "@/lib/nav/acquisition";

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
    body: "La fiche donne la zone, la répartition par branche, le nombre de contrats et les commissions. La composition détaillée arrive avec le mémorandum, après signature de l’accord de confidentialité.",
  },
  {
    title: "Chaque portefeuille est étudié",
    body: `${STUDY_SENTENCE} ${PRICE_RULE_SENTENCES[2]}`,
  },
  {
    title: "Votre identité reste confidentielle",
    body: `Pendant la séance, les autres candidats voient la meilleure offre et le nombre d’offres, jamais qui les a faites.`,
  },
  {
    title: RETENTION_TRUST_TITLE,
    body: RETENTION_TRUST_BODY,
  },
];

export default async function AcquerirPage() {
  const actor = await getActor();
  if (actor) {
    if (!isOriasVerified(actor)) redirect("/en-attente-orias");
    redirect(canBuy(actor) ? ACQUISITION_APP_PATH : "/app");
  }

  const loginHref = acquisitionLoginHref();

  return (
    <main>
      <PageIntro
        kicker="Acheter"
        title={NAV_BUY}
        actions={
          <>
            <Button asChild variant="primary" size="lg">
              <Link href={loginHref}>Se connecter pour acquérir</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/annonces">{CTA_BROWSE}</Link>
            </Button>
          </>
        }
      >
        Accès à des portefeuilles certifiés avec plus de 50 points de contrôle.
        Chaque portefeuille est étudié par notre équipe. Transaction sécurisée,
        accompagnement jusqu’au transfert des contrats.
      </PageIntro>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Acheter un portefeuille</h2>
        <ul className="mt-6 grid gap-3 lg:grid-cols-2">
          {BUY_POINTS.map((item) => (
            <li key={item} className="rounded-2xl border border-line bg-paper px-5 py-4 text-[15px] text-ink">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[14px] text-muted">
          <Link href="/tarifs" className="font-medium text-indigo underline-offset-2 hover:underline">
            {MARKET_ACCESS}
          </Link>
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="font-bold tracking-tight text-3xl font-semibold text-ink">
              Votre mandat d’achat
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Plutôt que de surveiller la salle de marché, vous décrivez une fois ce que
              vous cherchez. Chaque portefeuille en séance est confronté à votre demande,
              et ceux qui dépassent le seuil de mise en relation apparaissent dans vos
              correspondances, avec leur score.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Publiée en salle de marché, votre demande reste sous alias. Un cédant dont le
              portefeuille correspond peut vous le proposer directement : vous êtes prévenu,
              et vous prenez position depuis sa fiche.
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
          <h2 className="font-bold tracking-tight text-3xl font-semibold text-ink">
            Quatre garanties avant de signer
          </h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {SAFEGUARDS.map((item) => (
              <article key={item.title} className="rounded-3xl border border-line bg-surface-alt p-6">
                <h3 className="font-bold tracking-tight text-xl font-semibold text-ink">{item.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-line bg-paper p-8">
          <h2 className="font-bold tracking-tight text-2xl font-semibold text-ink">
            La transaction passe par un trust
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">
            Le catalogue reste libre. Dès que vous vous positionnez, un dépôt de{" "}
            {INTEREST_DEPOSIT_LABEL} du montant de l’annonce est versé dans un trust. Il lance la
            procédure de cession et vous donne le nom du cabinet cédant.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href={loginHref}>Se connecter pour déposer un mandat</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/inscription?voie=acheter">Créer un compte acquéreur</Link>
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
