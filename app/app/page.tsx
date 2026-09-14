import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DeskBand,
  DeskKpi,
  DeskPanel,
  LivePill,
  MarketTicker,
  PositionsTable,
  QuoteTable,
  TodoList,
} from "@/components/app/desk";
import {
  ActionGroup,
  ActionTile,
  GlanceCounter,
  DossierCard,
  RecentPanel,
  SectionHeading,
} from "@/components/app/toolbox";
import { DirectDealCard } from "@/components/direct/direct-deal-card";
import { getActor, isOriasVerified, listMyPortfolios } from "@/lib/authz";
import { loadDesk } from "@/lib/dashboard/desk";
import { loadMemberDossiers } from "@/lib/dashboard/member-dossiers";
import {
  SERVICE_ENTRIES,
  countByFilter,
  matchesFilter,
  serviceCreateHref,
  serviceListHref,
} from "@/lib/direct/services";
import { formatCount, formatEuroWhole } from "@/lib/format/number";
import { formatMultiple } from "@/lib/market/indices";

export const metadata = { title: "Poste de marché" };

const TONE_SERVICE = { kit: "kit", escrow: "escrow", attestations: "attestations" } as const;
const ICON_SERVICE = { kit: "clipboard", escrow: "shield", attestations: "file-check" } as const;

const seance = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

function volumeCourt(eur: number): string {
  if (eur >= 1_000_000) return `${(eur / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`;
  if (eur >= 10_000) return `${Math.round(eur / 1_000).toLocaleString("fr-FR")} k€`;
  return formatEuroWhole(eur);
}

/**
 * Poste de marché du courtier.
 *
 * Le tableau de bord se lit comme l'écran d'une salle de marché : en tête les
 * indices et ce qui défile en séance, puis ce qui vous attend, puis vos
 * positions ligne à ligne et la cote du jour. Rien à chercher : chaque ligne
 * mène à l'écran où l'on agit.
 */
export default async function MemberHomePage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (actor.role === "INVESTOR") redirect("/app/mes-dossiers");

  const [desk, portfolios] = await Promise.all([loadDesk(actor), listMyPortfolios(actor)]);
  const { cessions, achats } = await loadMemberDossiers(actor);
  const { vendeur, acheteur, indices, cote, bandeau, aFaire, lignes, compteurs, directs, enAttenteDuCedant } = desk;

  const annonceHref = portfolios.length > 0 ? "/app/annonces/nouvelle" : "/app/import";
  const directCounts = countByFilter(directs);
  const prenom = actor.fullName?.split(" ")[0] ?? null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <DeskBand>
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <LivePill />
                <span className="text-[13px] font-semibold text-ink">Séance du {seance.format(new Date())}</span>
              </div>
              <h1 className="mt-4 text-[1.9rem] font-bold leading-tight tracking-tight sm:text-4xl">
                {prenom ? `Bonjour ${prenom}.` : "Bonjour."}{" "}
                <span>Prenez position.</span>
              </h1>
              <p className="mt-2 max-w-xl text-[15px] font-medium leading-relaxed text-ink">
                Le marché du jour, ce qui vous attend et l’avancement de chacune de vos positions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/annonces"
                className="inline-flex h-11 items-center rounded-full bg-white px-5 text-[15px] font-semibold !text-indigo-dark shadow-sm hover:bg-indigo-soft"
              >
                Acheter
              </Link>
              {vendeur ? (
                <Link
                  href={annonceHref}
                  className="inline-flex h-11 items-center rounded-full border border-indigo bg-paper px-5 text-[15px] font-semibold !text-indigo-dark hover:bg-indigo-soft"
                >
                  Vendre
                </Link>
              ) : null}
            </div>
          </div>

          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink">Le marché</p>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DeskKpi
              label="En séance"
              value={formatCount(indices.enSeance)}
              note={`dont ${formatCount(indices.scellees)} en séance d’offres`}
              href="/annonces"
            />
            <DeskKpi label="Volume en séance" value={volumeCourt(indices.volumeEur)} note="Somme des prix demandés" />
            <DeskKpi label="Multiple moyen" value={formatMultiple(indices.multipleMoyen)} note="Prix demandé ÷ commissions annuelles" />
            <DeskKpi
              label="Clôtures sous 7 jours"
              value={formatCount(indices.cloturesSousSeptJours)}
              note={`${formatCount(indices.vendus)} portefeuille${indices.vendus > 1 ? "s" : ""} déjà vendu${indices.vendus > 1 ? "s" : ""}`}
              accent={indices.cloturesSousSeptJours > 0}
            />
          </div>

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink">Votre activité</p>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DeskKpi label="Positions ouvertes" value={formatCount(compteurs.positionsOuvertes)} href="#positions" />
            <DeskKpi
              label="Offres en attente"
              value={formatCount(compteurs.offresEnAttente)}
              note="Faites ou reçues, sans réponse"
              accent={compteurs.offresEnAttente > 0}
              href="#positions"
            />
            <DeskKpi label="Annonces en séance" value={formatCount(compteurs.annoncesEnSeance)} href="/app/cessions" />
            <DeskKpi
              label="Notifications"
              value={formatCount(compteurs.nonLues)}
              note={compteurs.nonLues > 0 ? "non lues" : "tout est lu"}
              accent={compteurs.nonLues > 0}
              href="/app/notifications"
            />
          </div>
        </div>
        <MarketTicker items={bandeau} />
      </DeskBand>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 content-start gap-6">
          <DeskPanel title="À faire maintenant" subtitle="Le plus urgent en premier. Chaque ligne ouvre l’écran où agir.">
            <div className="p-4">
              <TodoList items={aFaire} waiting={enAttenteDuCedant} />
            </div>
          </DeskPanel>

          <div id="positions" className="scroll-mt-24">
            <DeskPanel
              title="Mes positions"
              subtitle="Achats, ventes et demandes, du plus actif au plus ancien."
              action={{ href: "/app/achats", label: "Tout voir" }}
            >
              <PositionsTable
                rows={lignes}
                empty={
                  <>
                    Aucune position pour le moment.{" "}
                    <Link href="/annonces" className="font-semibold text-indigo-dark">
                      Parcourez la salle de marché
                    </Link>{" "}
                    et prenez position sur un portefeuille.
                  </>
                }
              />
            </DeskPanel>
          </div>
        </div>

        <aside className="grid content-start gap-6">
          <DeskPanel title="Cote de la salle" subtitle="Les séances qui ferment en premier." action={{ href: "/annonces", label: "Toute la salle" }}>
            <QuoteTable items={cote} />
          </DeskPanel>
        </aside>
      </div>

      <section className="mt-10 scroll-mt-24" id="actions-rapides" aria-labelledby="titre-actions-rapides">
        <SectionHeading icon="bolt" title="Actions rapides" id="titre-actions-rapides" />
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          <ActionGroup
            icon="briefcase"
            iconColor="#6d5dd3"
            title="Parcours intermédié toutes options, avec assistance bout en bout"
            lede="Nous menons la cession de bout en bout : aucun service à ajouter, tout est compris."
          >
            {vendeur ? (
              <ActionTile href={annonceHref} icon="bag" tone="sell" title="Vendre" subtitle="Mettre votre portefeuille en séance" />
            ) : null}
            {acheteur ? (
              <ActionTile href="/annonces" icon="search" tone="buy" title="Acheter" subtitle="Prendre position en salle de marché" />
            ) : null}
          </ActionGroup>

          <ActionGroup
            icon="tools"
            iconColor="#3f8c61"
            title="Boîte à malice des services à la carte en toute autonomie"
            lede="Vous avez trouvé votre contrepartie ? Prenez seulement ce qui vous manque, avec le même niveau de sécurité."
          >
            {SERVICE_ENTRIES.map((entry) => (
              <ActionTile
                key={entry.key}
                href={serviceCreateHref(entry)}
                icon={ICON_SERVICE[entry.key]}
                tone={TONE_SERVICE[entry.key]}
                title={entry.title}
                subtitle={entry.tagline}
              />
            ))}
            {vendeur ? (
              <ActionTile href={annonceHref} icon="megaphone" tone="listing" title="Créer une annonce" subtitle="Mettre en vente" />
            ) : null}
            {acheteur ? (
              <ActionTile href="/app/mandats" icon="cart" tone="wanted" title="Annonce d’achat" subtitle="Décrire le portefeuille recherché" />
            ) : null}
          </ActionGroup>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="vos-dossiers">
        <SectionHeading icon="chart" title="Vos dossiers en un coup d’œil" id="vos-dossiers" />
        <ul className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <GlanceCounter
            href="/app/cessions"
            icon="bag"
            tone="sell"
            value={cessions.length}
            badge={cessions.filter((c) => c.active).length}
            label="Mes cessions"
          />
          <GlanceCounter
            href="/app/achats"
            icon="search"
            tone="buy"
            value={achats.length}
            badge={achats.filter((c) => c.active).length}
            label="Mes achats"
          />
          {SERVICE_ENTRIES.map((entry) => (
            <GlanceCounter
              key={entry.key}
              href={serviceListHref(entry)}
              icon={ICON_SERVICE[entry.key]}
              tone={TONE_SERVICE[entry.key]}
              value={directCounts[entry.filter]}
              label={entry.listTitle}
            />
          ))}
        </ul>
      </section>

      {/*
       * Dossiers récents, présentés comme sur les plateformes que les courtiers
       * connaissent : un bloc par famille, les trois derniers dossiers en cartes,
       * et « Voir tout » pour la liste complète.
       */}
      <section className="mt-10" aria-labelledby="dossiers-recents">
        <SectionHeading icon="doc" title="Dossiers récents" id="dossiers-recents" />
        <div className="mt-5 grid gap-5">
          <RecentPanel
            icon="bag"
            tone="sell"
            title="Mes cessions"
            count={cessions.length}
            href="/app/cessions"
            emptyText="Pas encore de cessions"
          >
            {cessions.length > 0
              ? cessions.slice(0, 3).map(({ key, active: _active, ...item }) => <DossierCard key={key} {...item} />)
              : null}
          </RecentPanel>

          <RecentPanel
            icon="search"
            tone="buy"
            title="Mes achats"
            count={achats.length}
            href="/app/achats"
            emptyText="Pas encore d’achats"
          >
            {achats.length > 0
              ? achats.slice(0, 3).map(({ key, active: _active, ...item }) => <DossierCard key={key} {...item} />)
              : null}
          </RecentPanel>

          {SERVICE_ENTRIES.map((entry) => {
            const liste = directs.filter((d) => matchesFilter(d, entry.filter));
            return (
              <RecentPanel
                key={entry.key}
                icon={ICON_SERVICE[entry.key]}
                tone={TONE_SERVICE[entry.key]}
                title={entry.listTitle}
                count={liste.length}
                href={serviceListHref(entry)}
                emptyText={entry.emptyShort}
              >
                {liste.length > 0
                  ? liste.slice(0, 3).map((d) => (
                      <DirectDealCard key={d.id} deal={d} viewerId={actor.id} tone={TONE_SERVICE[entry.key]} />
                    ))
                  : null}
              </RecentPanel>
            );
          })}
        </div>
      </section>

    </main>
  );
}
