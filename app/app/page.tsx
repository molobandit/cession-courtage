import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getActor, isOriasVerified } from "@/lib/authz";
import { loadHome, type Acteur, type LigneAchat, type VenteParEtape } from "@/lib/dashboard/home";
import { ADVISOR_BOOKING_HREF, CTA_ADVISOR } from "@/lib/copy/market";
import { formatCount, formatEuroWhole } from "@/lib/format/number";

export const metadata = { title: "Accueil" };

/**
 * Accueil de l'espace membre.
 *
 * Une seule question à la fois : ce qu'il faut faire maintenant, puis où en
 * sont les ventes et les achats, sur les quatre étapes du dossier de
 * présentation. Rien d'autre : ni cote, ni compteurs, ni services à la carte.
 */
export default async function MemberHomePage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (actor.role === "INVESTOR") redirect("/app/mes-dossiers");

  const { prenom, deuxFacteurs, vendeur, acheteur, action, ventes, ventesTotal, achats, marche } =
    await loadHome(actor);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header>
        <h1 className="text-[1.75rem] font-bold tracking-tight text-ink sm:text-[2rem]">
          {prenom ? `Bonjour ${prenom}` : "Bonjour"}
        </h1>
        <p className="mt-1 text-[16px] text-muted">Voici où en sont vos dossiers.</p>
      </header>

      {deuxFacteurs ? null : (
        <aside className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[14px] text-ink">
            Protégez votre compte avec un code à six chiffres, en plus de votre mot de passe.
          </p>
          <Button asChild variant="outline">
            <Link href="/app/profil#securite">Activer</Link>
          </Button>
        </aside>
      )}

      <section
        aria-labelledby="prochaine-action"
        className="mt-6 rounded-2xl border border-indigo-line bg-indigo-soft p-5 sm:p-6"
      >
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-indigo-dark">
          Prochaine action
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 id="prochaine-action" className="text-[18px] font-semibold text-ink">
              {action.title}
            </h2>
            <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted">{action.detail}</p>
          </div>
          <Button asChild variant="primary">
            <Link href={action.href}>{action.cta}</Link>
          </Button>
        </div>
      </section>

      {vendeur ? (
        <section aria-labelledby="mes-ventes" className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="mes-ventes" className="text-[20px] font-semibold text-ink">
              Mes ventes
            </h2>
            <Link href="/app/cessions" className="text-[14px] font-medium text-indigo-dark">
              Tout voir
            </Link>
          </div>
          {ventesTotal > 0 ? (
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ventes.map((etape) => (
                <EtapeVente key={etape.step.key} etape={etape} />
              ))}
            </ol>
          ) : (
            <EcranVide
              titre="Vous n’avez pas encore de vente"
              texte="Confiez votre portefeuille à notre équipe : nous réalisons l’étude, déterminons la valeur et publions l’annonce sous un numéro de dossier."
              href="/app/annonces/nouvelle"
              cta="Confier mon portefeuille"
            />
          )}
        </section>
      ) : null}

      {acheteur ? (
        <section aria-labelledby="mes-achats" className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="mes-achats" className="text-[20px] font-semibold text-ink">
              Mes achats
            </h2>
            <Link href="/app/achats" className="text-[14px] font-medium text-indigo-dark">
              Tout voir
            </Link>
          </div>
          {achats.length > 0 ? (
            <ul className="mt-4 grid gap-3">
              {achats.map((ligne) => (
                <LigneAchatCarte key={ligne.positionId} ligne={ligne} />
              ))}
            </ul>
          ) : (
            <EcranVide
              titre="Vous ne suivez aucun dossier"
              texte="Chaque portefeuille de la salle de marché a été étudié et chiffré avant sa mise en ligne. Le montant affiché est celui de l’annonce."
              href="/annonces"
              cta="Voir les portefeuilles"
            />
          )}
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
          <h2 className="text-[18px] font-semibold text-ink">Salle de marché</h2>
          <p className="mt-2 text-[15px] text-muted">
            {formatCount(marche.total)} portefeuille{marche.total > 1 ? "s" : ""} en ligne, dont{" "}
            {formatCount(marche.certifies)} certifié{marche.certifies > 1 ? "s" : ""}.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/annonces">Voir les portefeuilles</Link>
          </Button>
        </div>

        <div className="rounded-2xl bg-deep-soft p-5 text-white sm:p-6">
          <h2 className="text-[18px] font-semibold">Un conseiller vous répond</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-white/80">
            Djesi Bayeye, fondateur, 15 ans de courtage en France et en Suisse.
          </p>
          <Button asChild variant="outline" className="mt-5 border-white/40 bg-white text-deep-soft hover:bg-white/90">
            <Link href={ADVISOR_BOOKING_HREF}>{CTA_ADVISOR}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

/** Une étape de vente : son numéro, son nom, ce qu'elle contient, qui doit agir. */
function EtapeVente({ etape }: { etape: VenteParEtape }) {
  const actif = etape.count > 0;
  return (
    <li
      className={`rounded-2xl border p-4 ${actif ? "border-indigo-line bg-paper" : "border-line bg-surface-alt"}`}
    >
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-indigo-dark">
        {etape.step.num} · {etape.step.label}
      </p>
      <p className="mt-3 text-[15px] text-ink">
        <span className="tabular text-[22px] font-semibold">{formatCount(etape.count)}</span>{" "}
        {etape.count > 1 ? "dossiers" : "dossier"}
      </p>
      {etape.detail ? <p className="mt-1 text-[13px] text-muted">{etape.detail}</p> : null}
      {actif && etape.acteur ? <Pastille acteur={etape.acteur} /> : null}
    </li>
  );
}

function LigneAchatCarte({ ligne }: { ligne: LigneAchat }) {
  return (
    <li className="rounded-2xl border border-line bg-paper p-4">
      <Link href={`/app/positions/${ligne.positionId}`} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[15px] font-semibold text-ink">Dossier n° {ligne.numero}</span>
        <span className="min-w-0 flex-1 truncate text-[14px] text-muted">{ligne.libelle}</span>
        <span className="rounded-full bg-indigo-soft px-3 py-1 text-[13px] font-medium text-indigo-dark">
          {ligne.index >= 0 ? `0${ligne.index + 1} · ${ligne.etape}` : ligne.etape}
        </span>
        <span className="tabular text-[15px] font-semibold text-ink">{formatEuroWhole(ligne.montant)}</span>
        {ligne.acteur ? <Pastille acteur={ligne.acteur} /> : null}
      </Link>
    </li>
  );
}

/** Qui doit agir, dit en un mot. */
function Pastille({ acteur }: { acteur: Acteur }) {
  const mien = acteur === "À vous";
  return (
    <span
      className={`mt-3 inline-block rounded-full px-3 py-1 text-[12px] font-semibold ${
        mien ? "bg-indigo text-white" : "bg-surface-alt text-muted"
      }`}
    >
      {acteur}
    </span>
  );
}

/** Un écran vide dit quoi faire, et le bouton pour le faire. */
function EcranVide({
  titre,
  texte,
  href,
  cta,
}: {
  titre: string;
  texte: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-line bg-paper p-8 text-center">
      <p className="text-[17px] font-semibold text-ink">{titre}</p>
      <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-muted">{texte}</p>
      <Button asChild variant="primary" className="mt-5">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
