import Link from "next/link";
import { redirect } from "next/navigation";
import { DeskPanel, TodoList } from "@/components/app/desk";
import { DossierCard, RecentPanel, ToolIcon, type ToolIconName } from "@/components/app/toolbox";
import { DirectDealCard } from "@/components/direct/direct-deal-card";
import { ListingAdCard } from "@/components/listing/listing-ad-card";
import { getActor, isOriasVerified, listMyPortfolios } from "@/lib/authz";
import { loadDesk } from "@/lib/dashboard/desk";
import { loadMemberDossiers } from "@/lib/dashboard/member-dossiers";
import { SERVICE_ENTRIES, matchesFilter, serviceListHref } from "@/lib/direct/services";
import { formatCount } from "@/lib/format/number";

export const metadata = { title: "Accueil" };

const TONE_SERVICE = { kit: "kit", escrow: "escrow", attestations: "attestations" } as const;
const ICON_SERVICE = { kit: "clipboard", escrow: "shield", attestations: "file-check" } as const;

function Choice({
  href,
  icon,
  title,
  text,
  cta,
}: {
  href: string;
  icon: ToolIconName;
  title: string;
  text: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-line bg-paper p-5 transition hover:border-indigo hover:shadow-sm"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-soft text-indigo-dark">
        <ToolIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="mt-4 text-[18px] font-bold text-ink">{title}</span>
      <span className="mt-1 flex-1 text-[14px] leading-relaxed text-muted">{text}</span>
      <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-indigo-dark group-hover:text-indigo">
        {cta}
        <ToolIcon name="chevron-right" className="h-4 w-4" />
      </span>
    </Link>
  );
}

/**
 * Accueil de l'espace membre.
 *
 * Aussi simple qu'une page du bon coin : trois choix (acheter, vendre,
 * investir), ce qui vous attend, les meilleures affaires du moment, puis vos
 * dossiers récents. Chaque bloc mène à l'écran où l'on agit.
 */
export default async function MemberHomePage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");
  if (actor.role === "INVESTOR") redirect("/app/mes-dossiers");

  const [desk, portfolios] = await Promise.all([loadDesk(actor), listMyPortfolios(actor)]);
  const { cessions, achats } = await loadMemberDossiers(actor);
  const { vendeur, acheteur, indices, meilleures, aFaire, directs, enAttenteDuCedant } = desk;

  const annonceHref = portfolios.length > 0 ? "/app/annonces/nouvelle" : "/app/import";
  const prenom = actor.fullName?.split(" ")[0] ?? null;
  const services = SERVICE_ENTRIES.map((entry) => ({
    entry,
    liste: directs.filter((d) => matchesFilter(d, entry.filter)),
  })).filter((s) => s.liste.length > 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.9rem]">
          {prenom ? `Bonjour ${prenom}` : "Bonjour"}
        </h1>
        <p className="mt-1 text-[15px] text-muted">Que voulez-vous faire aujourd’hui ?</p>
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Choice
          href="/annonces"
          icon="search"
          title="Acheter un portefeuille"
          text={`${formatCount(indices.enSeance)} portefeuille${indices.enSeance > 1 ? "s" : ""} à vendre, avec prix, commissions et offres.`}
          cta="Voir les annonces"
        />
        {vendeur ? (
          <Choice
            href={annonceHref}
            icon="bag"
            title="Vendre mon portefeuille"
            text="Mise en vente gratuite, relue par notre équipe avant publication."
            cta="Mettre en vente"
          />
        ) : (
          <Choice
            href="/app/mandats"
            icon="cart"
            title="Déposer ma recherche"
            text="Décrivez le portefeuille recherché : les cédants vous proposent leurs dossiers."
            cta="Décrire ma recherche"
          />
        )}
        <Choice
          href="/investisseurs/opportunites"
          icon="chart"
          title="Investir"
          text="Financer une reprise ou entrer au capital d’un cabinet de courtage."
          cta="Voir les opportunités"
        />
      </div>

      {aFaire.length > 0 || enAttenteDuCedant > 0 ? (
        <DeskPanel className="mt-8" title="À faire" subtitle="Le plus urgent en premier.">
          <div className="p-4">
            <TodoList items={aFaire} waiting={enAttenteDuCedant} />
          </div>
        </DeskPanel>
      ) : null}

      {acheteur && meilleures.length > 0 ? (
        <section className="mt-8" aria-labelledby="meilleures-affaires">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="meilleures-affaires" className="text-xl font-bold tracking-tight text-ink">
                Meilleures affaires du moment
              </h2>
              <p className="mt-0.5 text-[14px] text-muted">Le plus de commissions pour le prix demandé.</p>
            </div>
            <Link href="/annonces?tri=meilleures" className="text-[14px] font-semibold text-indigo-dark hover:text-indigo">
              Toutes les meilleures affaires
            </Link>
          </div>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {meilleures.map((item) => (
              <ListingAdCard key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="dossiers-recents">
        <h2 id="dossiers-recents" className="text-xl font-bold tracking-tight text-ink">
          Mes dossiers récents
        </h2>
        <div className="mt-4 grid gap-5">
          {vendeur ? (
            <RecentPanel icon="bag" tone="sell" title="Mes ventes" count={cessions.length} href="/app/cessions" emptyText="Pas encore de vente">
              {cessions.length > 0
                ? cessions.slice(0, 3).map(({ key, active: _active, ...item }) => <DossierCard key={key} {...item} />)
                : null}
            </RecentPanel>
          ) : null}
          {acheteur ? (
            <RecentPanel icon="search" tone="buy" title="Mes achats" count={achats.length} href="/app/achats" emptyText="Pas encore d’achat">
              {achats.length > 0
                ? achats.slice(0, 3).map(({ key, active: _active, ...item }) => <DossierCard key={key} {...item} />)
                : null}
            </RecentPanel>
          ) : null}
          {services.map(({ entry, liste }) => (
            <RecentPanel
              key={entry.key}
              icon={ICON_SERVICE[entry.key]}
              tone={TONE_SERVICE[entry.key]}
              title={entry.listTitle}
              count={liste.length}
              href={serviceListHref(entry)}
              emptyText={entry.emptyShort}
            >
              {liste.slice(0, 3).map((d) => (
                <DirectDealCard key={d.id} deal={d} viewerId={actor.id} tone={TONE_SERVICE[entry.key]} />
              ))}
            </RecentPanel>
          ))}
        </div>
      </section>

      <p className="mt-8 rounded-2xl border border-line bg-paper px-5 py-4 text-[14px] text-muted">
        Vous avez déjà trouvé votre acheteur ou votre vendeur ?{" "}
        <Link href="/app/services/kits-contractuels" className="font-semibold text-indigo-dark hover:text-indigo">
          Services à la carte
        </Link>{" "}
        : contrats, séquestre et attestations, sans passer par une annonce.
      </p>
    </main>
  );
}
