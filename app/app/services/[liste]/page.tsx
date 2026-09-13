import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState, ToolIcon, type ToolIconName } from "@/components/app/toolbox";
import { DirectDealCard } from "@/components/direct/direct-deal-card";
import { ListControls } from "@/components/direct/list-controls";
import { getActor, isOriasVerified } from "@/lib/authz";
import { listMyDirectDealsPage } from "@/lib/direct/load";
import { listParams, serviceBySlug, serviceCreateHref, type ServiceKey } from "@/lib/direct/services";

const ICONE: Record<ServiceKey, ToolIconName> = {
  kit: "clipboard",
  escrow: "shield",
  attestations: "file-check",
};

export async function generateMetadata({ params }: { params: Promise<{ liste: string }> }) {
  const service = serviceBySlug((await params).liste);
  return { title: service?.listTitle ?? "Services" };
}

export default async function ServiceListPage({
  params,
  searchParams,
}: {
  params: Promise<{ liste: string }>;
  searchParams: Promise<{ tri?: string; ordre?: string; parPage?: string; page?: string }>;
}) {
  const { liste } = await params;
  const service = serviceBySlug(liste);
  if (!service) notFound();

  const actor = await getActor();
  if (!actor) redirect(`/connexion?next=/app/services/${liste}`);
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const reglages = listParams(await searchParams);
  const { total, dossiers } = await listMyDirectDealsPage({
    userId: actor.id,
    email: actor.email,
    filter: service.filter,
    ...reglages,
  });
  const pages = Math.max(1, Math.ceil(total / reglages.parPage));

  const lien = (page: number) => {
    const q = new URLSearchParams({
      tri: reglages.tri,
      ordre: reglages.ordre,
      parPage: String(reglages.parPage),
      page: String(page),
    });
    return `/app/services/${service.slug}?${q.toString()}`;
  };

  return (
    <main className="w-full">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/app" aria-label="Retour au tableau de bord" className="text-muted hover:text-ink">
              <ToolIcon name="arrow-left" className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{service.listTitle}</h1>
              <p className="mt-0.5 text-[15px] text-muted">{service.listLede}</p>
            </div>
          </div>
          <Link
            href={serviceCreateHref(service)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-dark px-5 text-[15px] font-semibold !text-white hover:bg-indigo"
          >
            <ToolIcon name="plus" className="h-4 w-4" />
            {service.newLabel}
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <ListControls tri={reglages.tri} ordre={reglages.ordre} parPage={reglages.parPage} />

        {total === 0 ? (
          <div className="mt-6 rounded-2xl border border-line bg-paper shadow-sm">
            <EmptyState
              icon={ICONE[service.key]}
              title={service.emptyTitle}
              text={service.emptyText}
              action={{ href: serviceCreateHref(service), label: service.createLabel }}
            />
          </div>
        ) : (
          <>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dossiers.map((d) => (
                <DirectDealCard key={d.id} deal={d} viewerId={actor.id} tone={service.key} />
              ))}
            </ul>
            {pages > 1 ? (
              <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-3 text-[14px]">
                {reglages.page > 1 ? (
                  <Link href={lien(reglages.page - 1)} className="rounded-lg border border-line bg-paper px-4 py-2 hover:border-indigo">
                    Précédent
                  </Link>
                ) : null}
                <span className="tabular text-muted">
                  Page {reglages.page} sur {pages}
                </span>
                {reglages.page < pages ? (
                  <Link href={lien(reglages.page + 1)} className="rounded-lg border border-line bg-paper px-4 py-2 hover:border-indigo">
                    Suivant
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
