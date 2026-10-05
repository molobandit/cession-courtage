import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getActor, isOriasVerified } from "@/lib/authz";
import {
  loadHome,
  type Acteur,
  type DossierLigne,
  type PositionRecue,
  type Tuile,
} from "@/lib/dashboard/home";
import { ACCESS_PRICE_LINE, ADVISOR_BOOKING_HREF, CTA_ADVISOR } from "@/lib/copy/market";
import { NOM_ACQUEREUR_REGLE } from "@/lib/listing/positioned-buyers";
import { ADVISOR_MEMBER_LINE, ADVISOR_TITLE } from "@/lib/copy/investors";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import { formatDate } from "@/lib/format/fr";

export const metadata = { title: "Accueil" };

/**
 * Accueil de l'espace membre.
 *
 * Un bandeau en haut dit où en sont toutes les affaires du membre, et ce qu'il
 * faut faire ensuite. En dessous, le détail dossier par dossier, sur les quatre
 * étapes du dossier de présentation : l'étude, la mise en ligne, le
 * positionnement, la signature. Rien d'autre : ni cote, ni services à la carte.
 */
export default async function MemberHomePage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (actor.role === "INVESTOR") redirect("/app/mes-dossiers");

  const { prenom, deuxFacteurs, vendeur, acheteur, abonnement, action, tuiles, ventes, achats, recues, marche } =
    await loadHome(actor);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header>
        <h1 className="text-[1.75rem] font-bold tracking-tight text-ink sm:text-[2rem]">
          {prenom ? `Bonjour ${prenom}` : "Bonjour"}
        </h1>
      </header>

      <section
        aria-labelledby="affaires-en-cours"
        className="mt-5 rounded-[1.5rem] bg-gradient-to-br from-[#4f46e5] to-[#4338ca] p-5 text-white sm:p-7"
      >
        <h2 id="affaires-en-cours" className="text-[22px] font-bold tracking-tight sm:text-[26px]">
          Vos affaires en cours
        </h2>
        <p className="mt-1 text-[14px] text-white/75">
          Mis à jour à l’instant ·{" "}
          {abonnement.actif ? (
            <>
              abonnement accès au marché actif
              {abonnement.jusquau ? ` jusqu’au ${formatDate(abonnement.jusquau)}` : ""}
            </>
          ) : (
            <>
              sans abonnement ·{" "}
              <Link href="/tarifs#abonnements" className="font-semibold text-white underline underline-offset-2">
                accès au marché {ACCESS_PRICE_LINE}
              </Link>
            </>
          )}
        </p>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tuiles.map((tuile) => (
            <TuileChiffre key={tuile.libelle} tuile={tuile} />
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4">
          <p className="min-w-0 text-[15px] leading-relaxed text-ink">
            <span className="font-semibold text-indigo-dark">Prochaine action</span> · {action.title}
            {action.detail ? ` : ${action.detail}` : ""}
          </p>
          <Button asChild variant="primary">
            <Link href={action.href}>{action.cta}</Link>
          </Button>
        </div>
      </section>

      {deuxFacteurs ? null : (
        <aside className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-[13px] text-muted">
          <p>Protégez votre compte avec un code à six chiffres, en plus de votre mot de passe.</p>
          <Link href="/app/profil#securite" className="font-medium text-indigo-dark">
            Activer la double authentification
          </Link>
        </aside>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {vendeur ? (
          <Bloc titre="Mes ventes" href="/app/cessions" lien="Tout voir">
            {ventes.length > 0 ? (
              <ul className="divide-y divide-line">
                {ventes.map((ligne) => (
                  <LigneDossier key={ligne.key} ligne={ligne} />
                ))}
              </ul>
            ) : (
              <Vide
                texte="Confiez votre portefeuille à notre équipe : nous réalisons l’étude, déterminons la valeur et publions l’annonce sous un numéro de dossier."
                href="/app/annonces/nouvelle"
                cta="Confier mon portefeuille"
              />
            )}
          </Bloc>
        ) : null}

        {acheteur ? (
          <Bloc titre="Mes achats" href="/app/achats" lien="Tout voir">
            {achats.length > 0 ? (
              <ul className="divide-y divide-line">
                {achats.map((ligne) => (
                  <LigneDossier key={ligne.key} ligne={ligne} />
                ))}
              </ul>
            ) : (
              <Vide href="/annonces" cta="Voir les portefeuilles" />
            )}
          </Bloc>
        ) : null}

        {vendeur ? (
          <Bloc titre="Positionnements reçus" href="/app/cessions" lien="Tout voir">
            {recues.length > 0 ? (
              <>
                <ul className="divide-y divide-line">
                  {recues.map((ligne) => (
                    <LignePosition key={ligne.key} ligne={ligne} />
                  ))}
                </ul>
                <p className="px-5 py-4 text-[13px] leading-relaxed text-muted">
                  {NOM_ACQUEREUR_REGLE}
                </p>
              </>
            ) : (
              <p className="px-5 py-8 text-center text-[15px] leading-relaxed text-muted">
                Aucun acquéreur ne s’est encore positionné.
              </p>
            )}
          </Bloc>
        ) : null}

        <Bloc titre="La salle de marché" href="/annonces" lien="Voir les portefeuilles">
          <div className="px-5 py-4">
            <p className="text-[15px] font-semibold text-ink">
              {formatCount(marche.total)} portefeuille{marche.total > 1 ? "s" : ""} en ligne
            </p>
            <p className="mt-1 text-[13px] text-muted">
              dont {formatCount(marche.certifies)} certifié{marche.certifies > 1 ? "s" : ""}
              {marche.nouveaux > 0
                ? ` · ${formatCount(marche.nouveaux)} nouveau${marche.nouveaux > 1 ? "x" : ""} cette semaine`
                : ""}
            </p>
          </div>
          {marche.dernier ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">
                  Dernier publié · N° {marche.dernier.numero}
                </p>
                <p className="tabular mt-1 text-[13px] text-muted">
                  {formatEuroWhole(marche.dernier.commissions)} de commissions ·{" "}
                  {formatEuroWhole(marche.dernier.montant)}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/annonces/${marche.dernier.numero}`}>Voir</Link>
              </Button>
            </div>
          ) : null}
        </Bloc>
      </div>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-indigo-soft px-5 py-5 sm:px-7">
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold text-ink">{ADVISOR_TITLE}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">{ADVISOR_MEMBER_LINE}</p>
        </div>
        <Button asChild variant="primary">
          <Link href={ADVISOR_BOOKING_HREF}>{CTA_ADVISOR}</Link>
        </Button>
      </section>
    </main>
  );
}

/** Une tuile du bandeau : le chiffre, ce qu'il compte, et sa précision. */
function TuileChiffre({ tuile }: { tuile: Tuile }) {
  return (
    <li className="rounded-2xl bg-white/12 p-4">
      <p className="tabular text-[2rem] font-bold leading-none">{formatCount(tuile.valeur)}</p>
      <p className="mt-2 text-[15px] font-medium">{tuile.libelle}</p>
      {tuile.detail ? <p className="mt-1 text-[13px] text-white/70">{tuile.detail}</p> : null}
    </li>
  );
}

/** Un bloc du milieu : son titre, son lien, son contenu. */
function Bloc({
  titre,
  href,
  lien,
  children,
}: {
  titre: string;
  href: string;
  lien: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-paper">
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4">
        <h2 className="text-[18px] font-semibold text-ink">{titre}</h2>
        <Link href={href} className="text-[14px] font-medium text-indigo-dark">
          {lien}
        </Link>
      </div>
      {children}
    </section>
  );
}

/** Une ligne de dossier : son numéro, sa branche, son étape sur quatre. */
function LigneDossier({ ligne }: { ligne: DossierLigne }) {
  return (
    <li>
      <Link href={ligne.href} className="block px-5 py-4 hover:bg-surface-alt/60">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="min-w-0 text-[15px] text-ink">
            <span className="font-semibold">{ligne.titre}</span>
            <span className="text-muted"> · {ligne.libelle}</span>
          </p>
          {ligne.clos ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
              Clôturé
            </span>
          ) : ligne.acteur ? (
            <Pastille acteur={ligne.acteur} />
          ) : null}
        </div>
        <p className="mt-1 text-[13px] text-muted">
          {ligne.index >= 0 ? `0${ligne.index + 1} · ${ligne.etape}` : ligne.etape}
          {ligne.detail ? ` · ${ligne.detail}` : ""}
        </p>
        {ligne.index >= 0 ? (
          <span className="mt-2 block h-1.5 w-full max-w-[14rem] overflow-hidden rounded-full bg-surface-alt">
            <span
              className="block h-full rounded-full bg-indigo"
              style={{ width: `${((ligne.index + 1) / 4) * 100}%` }}
            />
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/** Un acquéreur positionné sur l'une de mes annonces. */
function LignePosition({ ligne }: { ligne: PositionRecue }) {
  return (
    <li>
      <Link href={ligne.href} className="block px-5 py-4 hover:bg-surface-alt/60">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[15px] font-semibold text-ink">N° {ligne.numero}</p>
          <Pastille acteur={ligne.acteur} />
        </div>
        <p className="mt-1 text-[13px] text-muted">
          {ligne.alias} · {ligne.detail}
        </p>
      </Link>
    </li>
  );
}

/** Qui doit agir, dit en un mot. */
function Pastille({ acteur }: { acteur: Acteur }) {
  const mien = acteur === "À vous";
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${
        mien ? "bg-indigo text-white" : "bg-indigo-soft text-indigo-dark"
      }`}
    >
      {acteur}
    </span>
  );
}

/** Un bloc vide dit quoi faire, et le bouton pour le faire. */
/** Un bloc vide : une phrase seulement quand elle apprend quelque chose, et le bouton. */
function Vide({ texte, href, cta }: { texte?: string; href: string; cta: string }) {
  return (
    <div className="px-5 pb-6 pt-2 text-center">
      {texte ? <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-muted">{texte}</p> : null}
      <Button asChild variant="primary" className="mt-4">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
