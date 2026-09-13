import Link from "next/link";
import { redirect } from "next/navigation";
import { OpenDirectDealForm } from "@/components/direct/open-direct-deal-form";
import { ServiceIcon } from "@/components/direct/service-icon";
import { getActor, isOriasVerified } from "@/lib/authz";
import { ATTESTATIONS_LABEL, ESCROW_LABEL, KIT_LABEL } from "@/lib/direct/fees";
import { listMyDirectDeals } from "@/lib/direct/load";
import {
  SERVICE_ENTRIES,
  countByFilter,
  matchesFilter,
  presetServices,
  serviceByFilter,
  serviceByKey,
} from "@/lib/direct/services";
import { progressPercent, stepByKey, type DirectStage } from "@/lib/direct/stages";
import { formatEuroWhole } from "@/lib/format/number";
import { formatDate } from "@/lib/format/fr";
import { cn } from "@/lib/utils";

export const metadata = { title: "Services à la carte" };

const TARIF: Record<string, string> = {
  kit: KIT_LABEL,
  escrow: ESCROW_LABEL,
  attestations: ATTESTATIONS_LABEL,
};

/**
 * Services à la carte, en toute autonomie.
 *
 * Deux cessions sur trois se nouent hors plateforme. Leur vendre
 * l'intermédiation entière n'aurait aucun sens : elles ont fait le travail. Ce
 * qui leur manque tient en trois services, que l'on prend séparément ou
 * ensemble — et que l'on retrouve ensuite, rangés par service.
 */
export default async function FormaliserPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; dossiers?: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/app/formaliser");
  if (!isOriasVerified(actor)) redirect("/en-attente-orias");

  const params = await searchParams;
  const service = serviceByKey(params.service);
  const filtre = serviceByFilter(params.dossiers);

  const dossiers = await listMyDirectDeals(actor.id, actor.email);
  const compteurs = countByFilter(dossiers);
  const affiches = filtre
    ? dossiers.filter((d) => matchesFilter(d, filtre.filter))
    : dossiers;

  const liste = (
    <section className="mt-10" id="dossiers">
      <h2 className="text-xl font-semibold text-ink">
        {filtre ? filtre.listTitle : "Vos dossiers"}
      </h2>
      <nav aria-label="Filtrer les dossiers" className="mt-4 flex flex-wrap gap-2">
        {[
          { href: "/app/formaliser#dossiers", label: "Tous", count: dossiers.length, actif: !filtre },
          ...SERVICE_ENTRIES.map((s) => ({
            href: `/app/formaliser?dossiers=${s.filter}#dossiers`,
            label: s.listTitle,
            count: compteurs[s.filter],
            actif: filtre?.filter === s.filter,
          })),
        ].map((onglet) => (
          <Link
            key={onglet.label}
            href={onglet.href}
            aria-current={onglet.actif ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-medium",
              onglet.actif
                ? "border-indigo bg-indigo text-white"
                : "border-line bg-paper text-ink hover:border-indigo",
            )}
          >
            {onglet.label}
            <span className={cn("tabular text-[13px]", onglet.actif ? "text-white/80" : "text-muted")}>
              {onglet.count}
            </span>
          </Link>
        ))}
      </nav>

      {affiches.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface-alt/60 px-5 py-6">
          <p className="text-[15px] text-muted">
            {filtre
              ? `Pas encore de dossier dans « ${filtre.listTitle} ».`
              : "Pas encore de dossier. Choisissez un service ci-dessus pour ouvrir le premier."}
          </p>
          {filtre ? (
            <Link
              href={`/app/formaliser?service=${filtre.key}#nouveau`}
              className="mt-3 inline-flex min-h-11 items-center text-[14px] font-medium text-indigo-dark"
            >
              {filtre.heading}
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {affiches.map((d) => {
            const services = { kit: d.kit, escrow: d.escrow, attestations: d.attestations };
            const avancement = progressPercent(d.stage as DirectStage, services);
            const pris = SERVICE_ENTRIES.filter((s) =>
              s.key === "attestations" ? d.attestations && !d.kit : services[s.key],
            ).map((s) => s.title);
            return (
              <li key={d.id}>
                <Link
                  href={`/app/formaliser/${d.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-line bg-paper px-5 py-4 hover:border-indigo-line"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{d.portfolioLabel}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {pris.join(" + ")} · {stepByKey(d.stage as DirectStage).label} · ouvert le{" "}
                      {formatDate(d.createdAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-4">
                    <span className="tabular text-[15px] font-semibold text-ink">
                      {formatEuroWhole(Number(d.salePrice))}
                    </span>
                    <span className="tabular w-12 text-right text-[13px] font-semibold text-indigo">
                      {avancement} %
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const formulaire = (
    <section
      id="nouveau"
      className="mt-10 scroll-mt-24 rounded-[1.75rem] border border-line bg-paper p-6 sm:p-8"
    >
      <h2 className="text-xl font-semibold text-ink">
        {service ? service.heading : "Ouvrir un dossier"}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        La contrepartie reçoit une invitation par e-mail pour confirmer les conditions. Elle
        n’a pas besoin d’un compte pour être désignée. Vous pouvez combiner les services.
      </p>
      <div className="mt-6">
        <OpenDirectDealForm key={service?.key ?? "tous"} initialServices={presetServices(service)} />
      </div>
    </section>
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo">
        Boîte à malice
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {service ? service.heading : "Services à la carte, en toute autonomie"}
      </h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        Vous vous êtes trouvés seuls et vous êtes d’accord sur le prix. Prenez uniquement ce
        qui vous manque : vous économisez l’intermédiation, sans rien céder sur la sécurité.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {SERVICE_ENTRIES.map((s) => {
          const actif = service?.key === s.key;
          return (
            <li key={s.key}>
              <Link
                href={`/app/formaliser?service=${s.key}#nouveau`}
                aria-current={actif ? "true" : undefined}
                className={cn(
                  "lift flex h-full flex-col rounded-2xl border p-5",
                  actif ? "border-indigo bg-indigo-soft/50" : "border-line bg-paper hover:border-indigo",
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-soft text-indigo-dark">
                  <ServiceIcon name={s.key} className="h-5 w-5" />
                </span>
                <span className="mt-3 text-[16px] font-semibold text-ink">{s.title}</span>
                <span className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{s.pitch}</span>
                <span className="mt-3 text-[13px] font-medium text-indigo-dark">{TARIF[s.key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {service ? (
        <>
          {formulaire}
          {dossiers.length > 0 ? liste : null}
        </>
      ) : (
        <>
          {liste}
          {formulaire}
        </>
      )}
    </main>
  );
}
