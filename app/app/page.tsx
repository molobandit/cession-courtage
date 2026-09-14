import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DeskPanel,
  MarketHero,
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
import { formatCount } from "@/lib/format/number";

export const metadata = { title: "Tableau de bord" };

const TONE_SERVICE = { kit: "kit", escrow: "escrow", attestations: "attestations" } as const;
const ICON_SERVICE = { kit: "clipboard", escrow: "shield", attestations: "file-check" } as const;

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
  const { vendeur, acheteur, indices, cote, aFaire, lignes, compteurs, directs, enAttenteDuCedant, demandesAchat, correspondances } = desk;

  const annonceHref = portfolios.length > 0 ? "/app/annonces/nouvelle" : "/app/import";
  const directCounts = countByFilter(directs);
  const prenom = actor.fullName?.split(" ")[0] ?? null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="border-b border-line pb-5">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-[#004fda] sm:text-[2rem]">Tableau de bord courtier</h1>
        <p className="mt-1 text-[16px] text-muted">
          {prenom ? `Bonjour ${prenom}, bienvenue sur votre tableau de bord` : "Bienvenue sur votre tableau de bord"}
        </p>
      </header>

      <div className="mt-6">
        <MarketHero
          tiles={[
            { label: "Portefeuilles", value: formatCount(indices.enSeance), href: "/annonces", icon: "folder" },
            { label: "Demandes d’achat", value: formatCount(demandesAchat), href: "/annonces/demandes", icon: "megaphone" },
            acheteur
              ? { label: "Recommandations", value: formatCount(correspondances), href: "/app/opportunites", icon: "bolt" }
              : { label: "Mes annonces en ligne", value: formatCount(compteurs.annoncesEnSeance), href: "/app/cessions", icon: "bag" },
          ]}
        />
      </div>

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
